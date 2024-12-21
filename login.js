import { abi as contractABI, contractAddress } from "./abi.js"; // Ensure the relative path to abi.js is correct

let web3;
let contract;

// Initialize Web3 and the Smart Contract
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

        // Initialize the contract
        contract = new web3.eth.Contract(contractABI, contractAddress);
    } else {
        alert('MetaMask not found! Please install MetaMask to proceed.');
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM fully loaded.");
    await initializeWeb3(); // Initialize Web3 when DOM is ready

    // Admin Login Form
    const adminLoginForm = document.getElementById("admin-login-form");
    if (adminLoginForm) {
        adminLoginForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const username = document.getElementById("admin-username").value.trim();
            const password = document.getElementById("admin-password").value.trim();

            if (username === "admin" && password === "adminpass") {
                alert("Admin login successful!");
                window.location.href = "admin.html"; // Redirect to admin dashboard
            } else {
                alert("Invalid Admin credentials.");
            }
        });
    } else {
        console.error("Admin login form not found.");
    }

    // Student Login Form
    const studentLoginForm = document.getElementById("student-login-form");
    if (studentLoginForm) {
        studentLoginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const username = document.getElementById("student-username").value.trim();
            const password = document.getElementById("student-password").value.trim();

            if (!username || !password) {
                alert("Please enter both username and password.");
                return;
            }

            try {
                const accounts = await web3.eth.getAccounts();
                const studentWallet = accounts[0];
                console.log("Connected MetaMask Account:", studentWallet);

                // Verify credentials using the smart contract
                const isValid = await contract.methods
                    .verifyCredentials(studentWallet, username, password)
                    .call();

                if (!isValid) {
                    alert("Invalid username or password.");
                    return;
                }

                console.log(`Login successful for: ${username}`);
                alert(`Welcome, ${username}!`);
                window.location.href = "student-dashboard.html"; // Redirect to student dashboard
            } catch (error) {
                console.error("Error during student login:", error);
                alert("Login failed. Please try again.");
            }
        });
    } else {
        console.error("Student login form not found.");
    }
});
