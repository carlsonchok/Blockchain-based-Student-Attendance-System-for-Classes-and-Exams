// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StudentAttendance {
    struct Student {
        string name;
        string username;
        bytes32 passwordHash; // Store the hashed password for security
        address walletAddress;
        bool isVerified; // Tracks if the student has verified their account
    }

    struct AttendanceRecord {
        bool isPresent;
        uint256 timestamp;
    }

    struct Class {
        string classId;
        string className;
        address[] studentList; // Students registered for this class
    }

    mapping(address => Student) private students; // Mapping wallet address to student details
    mapping(address => mapping(string => AttendanceRecord)) private attendance; // Attendance records by student and class
    mapping(string => Class) private classes; // Mapping class ID to class details
    mapping(string => bool) public classExists; // To check if a class exists (efficient lookup)
    mapping(string => address) private usernameToAddress; // To ensure unique usernames
    

    address[] private studentAddresses; // Array to keep track of registered addresses
    string[] private classIds; // List of class IDs

    address public admin;
    uint256 public verificationFee;

    event StudentRegistered(string name, string username, address walletAddress);
    event StudentVerified(address walletAddress);
    event AttendanceMarked(address walletAddress, string classId, uint256 timestamp);
    event ClassCreated(string classId, string className);
    event StudentUpdated(address walletAddress);
    event VerificationFeeUpdated(uint256 oldFee, uint256 newFee);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action.");
        _;
    }

    modifier onlyVerifiedStudent() {
        require(students[msg.sender].isVerified, "Student account is not verified.");
        _;
    }

    constructor() {
        admin = msg.sender;
        verificationFee = 0.01 ether; // Default verification fee
    }

    // Admin registers a student
    function registerStudent(
        string memory name,
        string memory username,
        string memory password,
        address walletAddress
    ) public onlyAdmin {
        require(walletAddress != address(0), "Invalid wallet address.");
        require(bytes(username).length > 0, "Username is required.");
        require(bytes(name).length > 0, "Name is required.");
        require(students[walletAddress].walletAddress == address(0), "Student is already registered.");
        require(usernameToAddress[username] == address(0), "Username already exists.");

        bytes32 passwordHash = keccak256(abi.encodePacked(password));

        students[walletAddress] = Student(name, username, passwordHash, walletAddress, false);
        usernameToAddress[username] = walletAddress;
        studentAddresses.push(walletAddress);

        emit StudentRegistered(name, username, walletAddress);
    }

    // Student verifies their account by sending a transaction
    function verifyAccount() public payable {
        require(bytes(students[msg.sender].username).length > 0, "Student not registered.");
        require(!students[msg.sender].isVerified, "Student already verified.");
        require(msg.value >= verificationFee, "Insufficient verification fee.");

        students[msg.sender].isVerified = true;

        emit StudentVerified(msg.sender);
    }

    // Admin creates a class
    function createClass(string memory classId, string memory className) public onlyAdmin {
        require(bytes(classId).length > 0, "Class ID is required.");
        require(bytes(className).length > 0, "Class Name is required.");
        require(!classExists[classId], "Class already exists.");

        // Initialize the Class struct and add it to the classes mapping
        classes[classId] = Class({
            classId: classId,
            className: className,
            studentList: new address[](0)  //ectly initialize the array
        });

        // Update classIds array and classExists mapping
        classIds.push(classId);
        classExists[classId] = true;

        emit ClassCreated(classId, className);
    }

    // Add this function to your contract
    function getAttendanceRecord(address studentAddress, string memory classId)
        public
        view
        returns (bool isPresent, uint256 timestamp)
    {
        AttendanceRecord memory record = attendance[studentAddress][classId];
        return (record.isPresent, record.timestamp);
    }

    // Admin can update student details
    function updateStudent(
        address walletAddress,
        string memory name,
        string memory username
    ) public onlyAdmin {
        require(bytes(students[walletAddress].username).length > 0, "Student not registered.");
        require(usernameToAddress[username] == address(0) || usernameToAddress[username] == walletAddress, "Username already exists.");

        students[walletAddress].name = name;
        students[walletAddress].username = username;

        emit StudentUpdated(walletAddress);
    }

    // Add student to a class
    function addStudentToClass(string memory classId, address studentAddress) public onlyAdmin {
        require(classExists[classId], "Class does not exist.");
        require(students[studentAddress].walletAddress != address(0), "Student not registered.");
        require(!checkStudentEnrollment(classId, studentAddress), "Student already in class.");

        classes[classId].studentList.push(studentAddress);
    }

    // Check if a student is in a class
    function isStudentInClass(string memory classId, address studentAddress) public view returns (bool) {
        return checkStudentEnrollment(classId, studentAddress);
    }

    // Mark attendance for a class
    function markAttendance(string memory classId) public onlyVerifiedStudent {
        require(classExists[classId], "Class not found.");
        require(checkStudentEnrollment(classId, msg.sender), "Student not enrolled in this class.");

        AttendanceRecord storage record = attendance[msg.sender][classId];
        require(!record.isPresent, "Attendance already marked.");

        record.isPresent = true;
        record.timestamp = block.timestamp;

        emit AttendanceMarked(msg.sender, classId, block.timestamp);
    }
    
    uint256 public attendanceFee = 0.01 ether;  // Define the fee for fetching attendance

    // Admin can fetch class attendance
    function getClassAttendance(string memory classId) public payable onlyAdmin returns (address[] memory, bool[] memory) {
        require(msg.value >= attendanceFee, "Insufficient fee to fetch attendance.");
        require(classExists[classId], "Class does not exist.");

        address[] memory studentList = classes[classId].studentList;
        bool[] memory attendanceList = new bool[](studentList.length);

        for (uint256 i = 0; i < studentList.length; i++) {
            AttendanceRecord memory record = attendance[studentList[i]][classId];
            attendanceList[i] = record.isPresent;
        }

        return (studentList, attendanceList);
    }

    function getAttendanceFee() public view returns (uint256) {
    return attendanceFee;
    }

    // Get all registered student addresses
    function getAllStudents() public view returns (address[] memory) {
        return studentAddresses;
    }

    // Get all classes a student is enrolled in
    function getStudentClasses(address studentAddress) public view returns (string[] memory) {
        require(students[studentAddress].walletAddress != address(0), "Student not registered.");

        string[] memory enrolledClasses = new string[](classIds.length);
        uint256 count = 0;

        for (uint256 i = 0; i < classIds.length; i++) {
            if (checkStudentEnrollment(classIds[i], studentAddress)) {
                enrolledClasses[count] = classIds[i];
                count++;
            }
        }

        string[] memory result = new string[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = enrolledClasses[i];
        }
        return result;
    }

    // Check if the username is already taken
    function isUsernameTaken(string memory username) public view returns (bool) {
        return usernameToAddress[username] != address(0);
    }

    // Verify login credentials
    function verifyCredentials(address studentAddress, string memory username, string memory password)
        public
        view
        returns (bool)
    {
        require(bytes(students[studentAddress].username).length > 0, "Student not registered.");
        Student memory student = students[studentAddress];
        bytes32 passwordHash = keccak256(abi.encodePacked(password));
        return keccak256(abi.encodePacked(student.username)) == keccak256(abi.encodePacked(username)) &&
            student.passwordHash == passwordHash;
    }

    // Get all classes
    function getAllClasses() public view returns (string[] memory) {
        return classIds;
    }

    // Get student details
    function getStudentDetails(address studentAddress)
        public
        view
        returns (string memory name, string memory username, bool isVerified)
    {
        require(bytes(students[studentAddress].username).length > 0, "Student not registered.");
        Student memory student = students[studentAddress];
        return (student.name, student.username, student.isVerified);
    }

    // Get class details
    function getClassDetails(string memory classId)
        public
        view
        returns (string memory className, address[] memory studentList)
    {
        require(classExists[classId], "Class not found.");
        Class memory classDetail = classes[classId];
        return (classDetail.className, classDetail.studentList);
    }

    // Helper function to check if a student is enrolled in a class
    function checkStudentEnrollment(string memory classId, address studentAddress) internal view returns (bool) {
        address[] memory studentList = classes[classId].studentList;
        for (uint256 i = 0; i < studentList.length; i++) {
            if (studentList[i] == studentAddress) {
                return true;
            }
        }
        return false;
    }

    // Update verification fee
    function updateVerificationFee(uint256 newFee) public onlyAdmin {
        uint256 oldFee = verificationFee;
        verificationFee = newFee;
        emit VerificationFeeUpdated(oldFee, newFee);
    }
}
