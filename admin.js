import { abi as contractABI, contractAddress } from "./abi.js"; // Ensure the relative path to abi.js is correct

let web3;
let contract;

// Initialize Web3 instance
async function initializeWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is available!');
        web3 = new Web3(window.ethereum); // Initializing web3

        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' }); // Request MetaMask accounts
            console.log('Connected to MetaMask!');
        } catch (error) {
            console.error('User denied account access');
            alert('Please connect to MetaMask to continue.');
        }

        // Initialize the contract after web3 is ready
        contract = new web3.eth.Contract(contractABI, contractAddress);
    } else {
        alert('MetaMask not found! Please install MetaMask to proceed.');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const studentRegistrationForm = document.getElementById("register-student-form");

    if (studentRegistrationForm) {
        studentRegistrationForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("student-name").value.trim();
            const username = document.getElementById("student-username").value.trim();
            const password = document.getElementById("student-password").value.trim();
            const walletAddress = document.getElementById("student-wallet").value.trim();

            // Validate form fields
            if (!name || !username || !password || !walletAddress) {
                alert("All fields are required.");
                return;
            }

            if (!web3.utils.isAddress(walletAddress)) {
                alert("Invalid wallet address.");
                return;
            }

            try {
                // Check if username already exists
                const usernameTaken = await contract.methods.isUsernameTaken(username).call();
                if (usernameTaken) {
                    alert("Username already exists. Please choose a different one.");
                    return;
                }

                const accounts = await web3.eth.getAccounts();
                const adminAddress = accounts[0];

                // Use a fixed gas value to avoid estimation errors
                await contract.methods
                    .registerStudent(name, username, password, walletAddress)
                    .send({
                        from: adminAddress,
                        gas: 500000 // Use a higher gas limit
                    });

                alert(`Student ${name} registered successfully.`);
                studentRegistrationForm.reset(); // Reset the form fields
                location.reload(); // Automatically refresh the page after successful registration
            } catch (error) {
                console.error("Error registering student:", error);
                alert("An error occurred during registration. Please try again.");
            }
        });
    } else {
        console.error("Student registration form not found in the DOM.");
    }

    // Admin can create a class
    const createClassForm = document.getElementById("create-class-form");
    if (createClassForm) {
        createClassForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const classId = document.getElementById("class-id").value.trim();
            const className = document.getElementById("class-name").value.trim();

            if (!classId || !className) {
                alert("Please provide both class ID and class name.");
                return;
            }

            try {
                const accounts = await web3.eth.getAccounts();
                const adminAddress = accounts[0]; // Get the admin's wallet address

                // Estimate gas for creating the class
                const gasEstimate = await contract.methods
                    .createClass(classId, className)
                    .estimateGas({ from: adminAddress });

                // Send the transaction with the estimated gas
                await contract.methods
                    .createClass(classId, className)
                    .send({
                        from: adminAddress,
                        gas: gasEstimate, // Use the estimated gas
                    });

                alert(`Class ${className} created successfully.`);
                createClassForm.reset(); // Reset the form fields
                location.reload(); // Automatically refresh the page after successful class creation
            } catch (error) {
                console.error("Error creating class:", error);
                alert("An error occurred while creating the class. Please try again.");
            }
        });
    } else {
        console.error("Create class form not found in the DOM.");
    }

    // Admin can assign a student to a class
    const assignStudentForm = document.getElementById("assign-student-form");
    if (assignStudentForm) {
        assignStudentForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const classId = document.getElementById("class-id-to-assign").value.trim();
            const studentWallet = document.getElementById("student-wallet-to-assign").value.trim();

            if (!classId || !studentWallet) {
                alert("Please provide both class ID and student wallet address.");
                return;
            }

            if (!web3.utils.isAddress(studentWallet)) {
                alert("Invalid student wallet address.");
                return;
            }

            try {
                const accounts = await web3.eth.getAccounts();
                const adminAddress = accounts[0]; // Get the admin's wallet address

                // Estimate gas for assigning the student to the class
                const gasEstimate = await contract.methods
                    .addStudentToClass(classId, studentWallet)
                    .estimateGas({ from: adminAddress });

                // Send the transaction with the estimated gas
                await contract.methods
                    .addStudentToClass(classId, studentWallet)
                    .send({
                        from: adminAddress,
                        gas: gasEstimate, // Use the estimated gas
                    });

                alert(`Student successfully assigned to class ${classId}`);
                assignStudentForm.reset(); // Reset the form fields
                location.reload(); // Automatically refresh the page after assigning student to class
            } catch (error) {
                console.error("Error assigning student to class:", error);
                alert("An error occurred while assigning the student. Please try again.");
            }
        });
    } else {
        console.error("Assign student form not found in the DOM.");
    }

    // Get All Students Function
    async function getAllStudents() {
        try {
            // Get all student addresses
            const students = await contract.methods.getAllStudents().call();
            const studentListElement = document.getElementById("student-list");
            studentListElement.innerHTML = ""; // Clear any previous list
    
            // Check if students are available
            if (students.length === 0) {
                studentListElement.innerHTML = "<li>No students registered yet.</li>";
                return; // Exit early if no students
            }
    
            // Fetch details for each student
            for (let i = 0; i < students.length; i++) {
                const studentAddress = students[i];
    
                // Fetch student details using the contract method
                const studentDetails = await contract.methods.getStudentDetails(studentAddress).call();
    
                // Append the student name and address to the list
                const li = document.createElement("li");
                li.textContent = `${studentDetails.name} - ${studentAddress}`; // Display name and address
                studentListElement.appendChild(li);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
            alert("Failed to fetch students.");
        }
    }
    
    // Get All Classes Function
    async function getAllClasses() {
        try {
            const classIds = await contract.methods.getAllClasses().call();
            const classListElement = document.getElementById("class-list");
            classListElement.innerHTML = ""; // Clear any previous list
    
            // Fetch and display both class ID and class name
            for (let i = 0; i < classIds.length; i++) {
                // Fetch the class details using the class ID
                const classDetails = await contract.methods.getClassDetails(classIds[i]).call();
    
                const li = document.createElement("li");
                li.textContent = `${classDetails.className} - ${classIds[i]}`; // Display class name and ID
                classListElement.appendChild(li);
            }
        } catch (error) {
            console.error("Error fetching classes:", error);
            alert("Failed to fetch classes.");
        }
    }

    // Fetch Attendance for Class Function (updated for fee and names)
    window.getClassAttendance = async function () {
        const classId = document.getElementById("class-id-to-view").value.trim();
        if (!classId) {
            alert("Please enter a class ID.");
            return;
        }

        try {
            console.log(`Fetching attendance for class: ${classId}`);

            // Check if the class exists using the public classExists method
            const classExists = await contract.methods.classExists(classId).call();
            if (!classExists) {
                alert("Class does not exist.");
                return;
            }

            // Get the attendance fee from the contract
            const attendanceFee = await contract.methods.getAttendanceFee().call();

            // Send the fee along with the request
            const accounts = await web3.eth.getAccounts();
            const adminAddress = accounts[0];

            // Fetch attendance for the class and pay the fee
            const attendanceData = await contract.methods
                .getClassAttendance(classId)
                .call({
                    from: adminAddress,
                    value: attendanceFee,  // Send the required fee
                });

            const studentsInClass = attendanceData[0];
            const attendanceStatus = attendanceData[1];

            console.log("Fetched students and attendance:", studentsInClass, attendanceStatus);

            const attendanceListElement = document.getElementById("attendance-details");
            attendanceListElement.innerHTML = ""; // Clear any previous attendance list

            if (studentsInClass.length === 0) {
                alert("No students found in this class.");
                return;
            }

            // Display the attendance status for each student
            for (let i = 0; i < studentsInClass.length; i++) {
                const studentAddress = studentsInClass[i];
                const studentStatus = attendanceStatus[i] ? "Present" : "Absent";

                // Get the student's name from the contract
                const studentDetails = await contract.methods.getStudentDetails(studentAddress).call();
                const studentName = studentDetails[0]; // Assuming name is the first returned value

                // Create a list item displaying the student name, address, and attendance status
                const li = document.createElement("li");
                li.textContent = `${studentName} (${studentAddress}): ${studentStatus}`;
                attendanceListElement.appendChild(li);
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
            alert("Failed to fetch attendance. Please try again.");
        }
    };

    // Load Students, Classes, and Attendance on Page Load
    window.addEventListener("load", async () => {
        await initializeWeb3();
        await getAllStudents(); // Fetch and display all students
        await getAllClasses(); // Fetch and display all classes
    });

    // Event listener for viewing attendance
    const viewAttendanceForm = document.getElementById("view-attendance-form");
    if (viewAttendanceForm) {
        viewAttendanceForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await getClassAttendance(); // View attendance for the selected class
        });
    }
});
