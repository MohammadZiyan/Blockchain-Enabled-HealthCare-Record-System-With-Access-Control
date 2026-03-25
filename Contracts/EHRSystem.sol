// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EHRSystem
 * @dev Blockchain-Enabled E-Health Record Sharing System with Role-Based Access Control
 * @notice IILM University Major Project - CSE 2025-26
 *
 * Architecture:
 *  - Patient records (IPFS hashes) stored on-chain
 *  - AES-256 encrypted files stored off-chain on IPFS
 *  - Role-Based Access Control via smart contract
 *  - Immutable audit log for every access event
 */
contract EHRSystem {

    // ─── Roles ────────────────────────────────────────────────────────────────
    enum Role { None, Patient, Doctor, Hospital, Admin }

    // ─── Structs ──────────────────────────────────────────────────────────────
    struct User {
        string  name;
        Role    role;
        string  institution;   // hospital/clinic for doctors
        bool    isActive;
        uint256 registeredAt;
    }

    struct MedicalRecord {
        uint256 id;
        string  ipfsHash;          // encrypted file on IPFS
        string  recordType;        // "Lab Report", "Prescription", "Scan", etc.
        string  description;
        address uploadedBy;        // doctor or patient
        uint256 timestamp;
        bool    isActive;
    }

    struct AccessGrant {
        address grantee;           // doctor/hospital address
        uint256 grantedAt;
        uint256 expiresAt;         // 0 = no expiry
        bool    isActive;
    }

    struct AuditEntry {
        address actor;
        string  action;            // "UPLOAD", "ACCESS", "GRANT", "REVOKE", "REGISTER"
        address subject;           // patient address affected
        uint256 recordId;          // 0 if not record-specific
        uint256 timestamp;
    }

    // ─── State ────────────────────────────────────────────────────────────────
    address public owner;
    uint256 private _recordCounter;
    uint256 private _auditCounter;

    mapping(address => User)                              public users;
    mapping(address => uint256[])                         private patientRecordIds;
    mapping(uint256  => MedicalRecord)                    public records;
    mapping(address  => mapping(address => AccessGrant))  public accessGrants;  // patient -> doctor -> grant
    mapping(uint256  => AuditEntry)                       public auditLog;
    mapping(address  => bool)                             public registeredAddresses;

    // ─── Events ───────────────────────────────────────────────────────────────
    event UserRegistered(address indexed user, Role role, string name);
    event RecordUploaded(address indexed patient, uint256 indexed recordId, string ipfsHash, string recordType);
    event AccessGranted(address indexed patient, address indexed grantee, uint256 expiresAt);
    event AccessRevoked(address indexed patient, address indexed grantee);
    event RecordAccessed(address indexed accessor, address indexed patient, uint256 indexed recordId);
    event AuditLogged(uint256 indexed auditId, address actor, string action, uint256 timestamp);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "EHR: Not owner");
        _;
    }

    modifier onlyRegistered() {
        require(registeredAddresses[msg.sender], "EHR: Not registered");
        require(users[msg.sender].isActive, "EHR: Account deactivated");
        _;
    }

    modifier onlyRole(Role _role) {
        require(users[msg.sender].role == _role, "EHR: Insufficient role");
        _;
    }

    modifier onlyPatientOrDoctor() {
        require(
            users[msg.sender].role == Role.Patient ||
            users[msg.sender].role == Role.Doctor  ||
            users[msg.sender].role == Role.Hospital,
            "EHR: Unauthorized role"
        );
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        // Register deployer as Admin
        users[msg.sender] = User({
            name: "System Admin",
            role: Role.Admin,
            institution: "IILM University",
            isActive: true,
            registeredAt: block.timestamp
        });
        registeredAddresses[msg.sender] = true;
        _logAudit(msg.sender, "DEPLOY", msg.sender, 0);
    }

    // ─── Registration ─────────────────────────────────────────────────────────

    /**
     * @dev Self-registration for patients
     */
    function registerPatient(string calldata _name) external {
        require(!registeredAddresses[msg.sender], "EHR: Already registered");
        users[msg.sender] = User({
            name: _name,
            role: Role.Patient,
            institution: "",
            isActive: true,
            registeredAt: block.timestamp
        });
        registeredAddresses[msg.sender] = true;
        emit UserRegistered(msg.sender, Role.Patient, _name);
        _logAudit(msg.sender, "REGISTER_PATIENT", msg.sender, 0);
    }

    /**
     * @dev Admin registers doctors/hospitals
     */
    function registerDoctor(
        address _doctor,
        string calldata _name,
        string calldata _institution
    ) external onlyRegistered onlyRole(Role.Admin) {
        require(!registeredAddresses[_doctor], "EHR: Already registered");
        users[_doctor] = User({
            name: _name,
            role: Role.Doctor,
            institution: _institution,
            isActive: true,
            registeredAt: block.timestamp
        });
        registeredAddresses[_doctor] = true;
        emit UserRegistered(_doctor, Role.Doctor, _name);
        _logAudit(msg.sender, "REGISTER_DOCTOR", _doctor, 0);
    }

    function registerHospital(
        address _hospital,
        string calldata _name
    ) external onlyRegistered onlyRole(Role.Admin) {
        require(!registeredAddresses[_hospital], "EHR: Already registered");
        users[_hospital] = User({
            name: _name,
            role: Role.Hospital,
            institution: _name,
            isActive: true,
            registeredAt: block.timestamp
        });
        registeredAddresses[_hospital] = true;
        emit UserRegistered(_hospital, Role.Hospital, _name);
        _logAudit(msg.sender, "REGISTER_HOSPITAL", _hospital, 0);
    }

    // ─── Record Management ────────────────────────────────────────────────────

    /**
     * @dev Upload a new medical record (patient uploads their own, or doctor uploads for consented patient)
     */
    function uploadRecord(
        address _patient,
        string calldata _ipfsHash,
        string calldata _recordType,
        string calldata _description
    ) external onlyRegistered onlyPatientOrDoctor returns (uint256) {
        // If caller is doctor, they must have access to the patient
        if (users[msg.sender].role == Role.Doctor || users[msg.sender].role == Role.Hospital) {
            require(_hasAccess(msg.sender, _patient), "EHR: No access to this patient");
        } else {
            // Patient can only upload their own records
            require(msg.sender == _patient, "EHR: Can only upload your own records");
        }

        _recordCounter++;
        uint256 newId = _recordCounter;

        records[newId] = MedicalRecord({
            id: newId,
            ipfsHash: _ipfsHash,
            recordType: _recordType,
            description: _description,
            uploadedBy: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });

        patientRecordIds[_patient].push(newId);

        emit RecordUploaded(_patient, newId, _ipfsHash, _recordType);
        _logAudit(msg.sender, "UPLOAD", _patient, newId);

        return newId;
    }

    /**
     * @dev Get all record IDs for a patient (patient views own; doctor needs access)
     */
    function getPatientRecordIds(address _patient) external onlyRegistered view returns (uint256[] memory) {
        if (msg.sender != _patient) {
            require(_hasAccess(msg.sender, _patient), "EHR: No access to this patient");
        }
        return patientRecordIds[_patient];
    }

    /**
     * @dev Get a specific record (access-controlled)
     */
    function getRecord(address _patient, uint256 _recordId)
        external
        onlyRegistered
        returns (MedicalRecord memory)
    {
        if (msg.sender != _patient) {
            require(_hasAccess(msg.sender, _patient), "EHR: No access to this patient");
        }
        require(records[_recordId].isActive, "EHR: Record not found");

        emit RecordAccessed(msg.sender, _patient, _recordId);
        _logAudit(msg.sender, "ACCESS", _patient, _recordId);

        return records[_recordId];
    }

    // ─── Access Control ───────────────────────────────────────────────────────

    /**
     * @dev Patient grants access to a doctor/hospital
     * @param _grantee Doctor or hospital address
     * @param _durationSeconds 0 = no expiry
     */
    function grantAccess(address _grantee, uint256 _durationSeconds)
        external
        onlyRegistered
        onlyRole(Role.Patient)
    {
        require(registeredAddresses[_grantee], "EHR: Grantee not registered");
        require(
            users[_grantee].role == Role.Doctor || users[_grantee].role == Role.Hospital,
            "EHR: Grantee must be Doctor or Hospital"
        );

        uint256 expiresAt = _durationSeconds > 0
            ? block.timestamp + _durationSeconds
            : 0;

        accessGrants[msg.sender][_grantee] = AccessGrant({
            grantee: _grantee,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true
        });

        emit AccessGranted(msg.sender, _grantee, expiresAt);
        _logAudit(msg.sender, "GRANT_ACCESS", _grantee, 0);
    }

    /**
     * @dev Patient revokes access from a doctor/hospital
     */
    function revokeAccess(address _grantee)
        external
        onlyRegistered
        onlyRole(Role.Patient)
    {
        require(accessGrants[msg.sender][_grantee].isActive, "EHR: No active grant");
        accessGrants[msg.sender][_grantee].isActive = false;
        emit AccessRevoked(msg.sender, _grantee);
        _logAudit(msg.sender, "REVOKE_ACCESS", _grantee, 0);
    }

    /**
     * @dev Check if an address has active access to a patient's records
     */
    function checkAccess(address _patient, address _accessor) external view returns (bool) {
        return _hasAccess(_accessor, _patient);
    }

    // ─── Audit ────────────────────────────────────────────────────────────────

    /**
     * @dev Get audit entries for a patient (patient only, or admin)
     */
    function getAuditCount() external view returns (uint256) {
        return _auditCounter;
    }

    function getAuditEntry(uint256 _id) external view returns (AuditEntry memory) {
        require(
            users[msg.sender].role == Role.Admin ||
            users[msg.sender].role == Role.Patient,
            "EHR: Unauthorized"
        );
        return auditLog[_id];
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function deactivateUser(address _user) external onlyOwner {
        users[_user].isActive = false;
        _logAudit(msg.sender, "DEACTIVATE_USER", _user, 0);
    }

    function deactivateRecord(uint256 _recordId) external onlyOwner {
        records[_recordId].isActive = false;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _hasAccess(address _accessor, address _patient) internal view returns (bool) {
        if (users[_accessor].role == Role.Admin) return true;
        AccessGrant memory grant = accessGrants[_patient][_accessor];
        if (!grant.isActive) return false;
        if (grant.expiresAt != 0 && block.timestamp > grant.expiresAt) return false;
        return true;
    }

    function _logAudit(address _actor, string memory _action, address _subject, uint256 _recordId) internal {
        _auditCounter++;
        auditLog[_auditCounter] = AuditEntry({
            actor: _actor,
            action: _action,
            subject: _subject,
            recordId: _recordId,
            timestamp: block.timestamp
        });
        emit AuditLogged(_auditCounter, _actor, _action, block.timestamp);
    }
}
