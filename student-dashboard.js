import { abi as contractABI, contractAddress } from "./abi.js"; // Ensure the relative path to abi.js is correct

let web3;
let contract;

// Initialize Web3 and contract
async function initializeWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is available!');
        web3 = new Web3(window.ethereum);

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
        alert('Please install MetaMask to use this application.');
    }
}

// Get all the classes the student is enrolled in
async function getStudentClasses() {
    const accounts = await web3.eth.getAccounts();
    const studentAddress = accounts[0]; // Get the student's wallet address

    try {
        const enrolledClasses = await contract.methods.getStudentClasses(studentAddress).call();
        const classListElement = document.getElementById("class-list");
        classListElement.innerHTML = ""; // Clear any previous list

        if (enrolledClasses.length === 0) {
            classListElement.innerHTML = "<li>No classes enrolled.</li>";
        } else {
            for (const classId of enrolledClasses) {
                const classDetails = await contract.methods.getClassDetails(classId).call();
                const className = classDetails[0]; // Assuming the name is the first returned value
                const li = document.createElement("li");
                li.textContent = `${className} - ${classId}`; // Show both class name and ID
                classListElement.appendChild(li);
            }
        }
    } catch (error) {
        console.error("Error fetching enrolled classes:", error);
        alert("Failed to fetch enrolled classes. Please try again.");
    }
}

// Populate the class dropdown for marking attendance
async function populateClasses() {
    const accounts = await web3.eth.getAccounts();
    const studentAddress = accounts[0]; // Get the student's wallet address

    try {
        const enrolledClasses = await contract.methods.getStudentClasses(studentAddress).call();
        const classSelectElement = document.getElementById("class-select");

        if (!classSelectElement) {
            console.error("Class select dropdown not found!");
            return;
        }

        // Clear existing options
        classSelectElement.innerHTML = "";

        // Populate options
        for (const classId of enrolledClasses) {
            const classDetails = await contract.methods.getClassDetails(classId).call();
            const className = classDetails[0]; // Assuming the name is the first returned value
            const option = document.createElement("option");
            option.value = classId;
            option.textContent = `${className} - ${classId}`; // Show both class name and ID
            classSelectElement.appendChild(option);
        }
    } catch (error) {
        console.error("Error fetching classes:", error);
        alert("Failed to populate classes. Please try again.");
    }
}

// Verify the student's account by sending payment to the contract
async function verifyStudent() {
    const accounts = await web3.eth.getAccounts();
    const studentAddress = accounts[0];

    try {
        console.log(`Verifying student: ${studentAddress}`);

        // Send payment for verification (0.01 ether)
        const receipt = await contract.methods.verifyAccount().send({
            from: studentAddress,
            value: web3.utils.toWei("0.01", "ether"), // Payment for verification
        });

        console.log("Verification Receipt:", receipt);
        alert("Account successfully verified!");
    } catch (error) {
        console.error("Error verifying account:", error);
        alert("Failed to verify account. Please try again.");
    }
}

// Mark attendance for a class
async function markAttendance(classId) {
    const accounts = await web3.eth.getAccounts();
    const studentAddress = accounts[0];

    try {
        console.log(`Marking attendance for class: ${classId} by student: ${studentAddress}`);
        
        // Check if student is verified
        const studentDetails = await contract.methods.getStudentDetails(studentAddress).call();
        if (!studentDetails[2]) {
            alert("You need to verify your account before marking attendance.");
            return;
        }

        // Check enrollment
        const isEnrolled = await contract.methods.isStudentInClass(classId, studentAddress).call();
        console.log(`Is the student enrolled in class? ${isEnrolled}`);
        if (!isEnrolled) {
            alert("You are not enrolled in this class.");
            return;
        }

        // Fetch current attendance record
        const attendanceRecord = await contract.methods
            .getAttendanceRecord(studentAddress, classId)
            .call();
        console.log("Attendance Record before marking:", attendanceRecord);

        if (attendanceRecord.isPresent) {
            alert("Attendance already marked for this class.");
            return;
        }

        // Force higher gas limit for debugging
        const gasEstimate = 2000000; // Set high gas limit for debugging
        console.log("Using forced high gas estimate:", gasEstimate);

        const receipt = await contract.methods.markAttendance(classId).send({
            from: studentAddress,
            gas: gasEstimate,
        });

        alert(`Attendance for class ${classId} marked successfully!`);
    } catch (error) {
        console.error("Error marking attendance:", error);

        if (error.data) {
            console.error("Error data:", error.data);
        }

        alert("Failed to mark attendance. Please check your enrollment and wallet balance.");
    }
}

// Handle form submission to mark attendance
document.getElementById("attendance-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const classId = document.getElementById("class-select").value;

    if (!classId) {
        alert("Please select a class.");
        return;
    }

    await markAttendance(classId);
});

// Handle student verification
document.getElementById("verify-account-button").addEventListener("click", async () => {
    await verifyStudent();
});

// Initialize Web3 and load student data when page is loaded
window.addEventListener("load", async () => {
    await initializeWeb3();
    await getStudentClasses(); // Get enrolled classes
    await populateClasses(); // Populate the classes dropdown
});
