import { abi as contractABI, contractAddress } from "./abi.js"; // Ensure the relative path to abi.js is correct
let web3;
let contract;

// Initialize Web3
async function initializeWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        console.log("MetaMask is available.");
        web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        contract = new web3.eth.Contract(contractABI, contractAddress);
    } else {
        alert("Please install MetaMask to use this application.");
    }
}

// Load face-api models
async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    console.log("Face recognition models loaded.");
}

// Start webcam
async function startWebcam(videoElement) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    videoElement.srcObject = stream;
}

// Perform face recognition
async function performFaceRecognition(videoElement, savedFaceDescriptor, classId) {
    const displaySize = { width: videoElement.width, height: videoElement.height };
    faceapi.matchDimensions(videoElement, displaySize);

    // Detect face from live video
    const detections = await faceapi.detectSingleFace(videoElement).withFaceLandmarks().withFaceDescriptor();
    if (!detections) {
        document.getElementById("result").textContent = "No face detected. Please try again.";
        return;
    }

    // Compare live face with the stored descriptor
    const liveFaceDescriptor = detections.descriptor;
    const faceMatcher = new faceapi.FaceMatcher(savedFaceDescriptor);
    const bestMatch = faceMatcher.findBestMatch(liveFaceDescriptor);

    if (bestMatch.distance < 0.6) { // Threshold for matching (lower is stricter)
        document.getElementById("result").textContent = "Face matched! Marking attendance...";
        await markAttendance(classId); // Mark attendance on blockchain
    } else {
        document.getElementById("result").textContent = "Face does not match. Access denied.";
    }
}

// Mark attendance using smart contract
async function markAttendance(classId) {
    const accounts = await web3.eth.getAccounts();
    const studentWallet = accounts[0];
    try {
        await contract.methods.markAttendance(classId).send({ from: studentWallet });
        alert("Attendance marked successfully!");
    } catch (error) {
        console.error("Error marking attendance:", error);
        alert("Failed to mark attendance. Please try again.");
    }
}

// Main function
document.addEventListener("DOMContentLoaded", async () => {
    await initializeWeb3(); // Initialize Web3
    await loadModels(); // Load face-api models

    const videoElement = document.getElementById("video");
    const startScanButton = document.getElementById("start-scan-button");

    // Load saved face descriptor from your database (hardcoded here as an example)
    const savedFaceImage = await faceapi.fetchImage('/face-database.jpg');
    const savedFaceDetection = await faceapi.detectSingleFace(savedFaceImage).withFaceLandmarks().withFaceDescriptor();
    const savedFaceDescriptor = savedFaceDetection.descriptor;

    // Start webcam on button click
    startScanButton.addEventListener("click", async () => {
        document.getElementById("result").textContent = "Scanning face...";
        await startWebcam(videoElement);
        const classId = prompt("Enter Class ID:"); // Ask for the class ID
        await performFaceRecognition(videoElement, savedFaceDescriptor, classId);
    });
});
