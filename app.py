from flask import Flask, request, jsonify
from deepface import DeepFace
from web3 import Web3
import os
import json

# Initialize Flask App
app = Flask(__name__, static_folder="src")

# Function to Load ABI and Contract Address from abi.js
def load_abi_and_address():
    try:
        # Read abi.js file
        with open("src/js/abi.js", "r") as abi_file:
            abi_js = abi_file.read()

        # Extract the ABI
        start_abi = abi_js.index("const abi = [")
        end_abi = abi_js.index("];", start_abi) + 1
        abi = json.loads(abi_js[start_abi + len("const abi = "):end_abi])

        # Extract the Contract Address
        start_address = abi_js.index('const contractAddress = "') + len('const contractAddress = "')
        end_address = abi_js.index('";', start_address)
        contract_address = abi_js[start_address:end_address]

        return abi, contract_address
    except Exception as e:
        print(f"Error loading ABI and contract address: {e}")
        return None, None

# Load ABI and Contract Address
abi, contract_address = load_abi_and_address()
if not abi or not contract_address:
    raise Exception("Failed to load ABI or contract address. Please check abi.js.")

# Connect to Blockchain (via Web3)
web3 = Web3(Web3.HTTPProvider("http://127.0.0.1:7545"))  # Replace with your blockchain node (e.g., Ganache)
if not web3.is_connected():
    raise Exception("Failed to connect to the blockchain. Please ensure your blockchain node is running.")

contract = web3.eth.contract(address=contract_address, abi=abi)

# Flask API to Verify Face and Mark Attendance
@app.route('/verify_face', methods=['POST'])
def verify_face():
    try:
        # Get the face image and student ID from the request
        captured_face = request.files.get("captured_face")
        student_id = request.form.get("student_id")

        if not captured_face or not student_id:
            return jsonify({"status": "failed", "message": "Face image or student ID missing."}), 400

        # Save the uploaded image temporarily
        captured_path = f"temp/{student_id}_captured.jpg"
        os.makedirs("temp", exist_ok=True)  # Create the temp directory if it doesn't exist
        captured_face.save(captured_path)

        # Path to the registered face (stored during registration)
        registered_path = os.path.join("src", "registered_faces", f"{student_id}.jpg")
        if not os.path.exists(registered_path):
            return jsonify({"status": "failed", "message": "Registered face not found for this student."}), 404

        # Verify the face using DeepFace
        result = DeepFace.verify(captured_path, registered_path, model_name="Facenet")
        os.remove(captured_path)  # Clean up temporary file

        if result["verified"]:
            # If face matches, mark attendance on the blockchain
            try:
                accounts = web3.eth.accounts
                admin_account = accounts[0]  # Use the admin account to call the smart contract

                # Call the smart contract's markAttendance function
                tx = contract.functions.markAttendance("class1").transact({'from': admin_account})
                receipt = web3.eth.wait_for_transaction_receipt(tx)

                return jsonify({
                    "status": "success",
                    "message": "Face match! Attendance marked successfully.",
                    "transaction": receipt.transactionHash.hex()  # Return the transaction hash
                }), 200
            except Exception as e:
                return jsonify({"status": "error", "message": f"Blockchain error: {str(e)}"}), 500

        else:
            return jsonify({"status": "failed", "message": "Face mismatch! Attendance not marked."}), 401

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# Flask API to Register a Student (Save their Face Image)
@app.route('/register_student', methods=['POST'])
def register_student():
    try:
        # Get student details and face image from the request
        student_id = request.form.get("student_id")
        student_name = request.form.get("student_name")
        face_image = request.files.get("face_image")

        if not student_id or not student_name or not face_image:
            return jsonify({"status": "failed", "message": "Missing student details or face image."}), 400

        # Save the face image to the 'registered_faces' folder
        os.makedirs("src/registered_faces", exist_ok=True)  # Create the folder if it doesn't exist
        face_image_path = os.path.join("src", "registered_faces", f"{student_id}.jpg")
        face_image.save(face_image_path)

        return jsonify({"status": "success", "message": f"Student {student_name} registered successfully!"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
