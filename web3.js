import Web3 from "web3";

// Connect to MetaMask
export const connectMetaMask = async () => {
    if (window.ethereum) {
        try {
            await window.ethereum.request({ method: "eth_requestAccounts" });
            return new Web3(window.ethereum);
        } catch (error) {
            console.error("MetaMask connection failed:", error);
            throw error;
        }
    } else {
        alert("Please install MetaMask!");
        throw new Error("MetaMask not found");
    }
};

// Initialize the contract
export const initContract = async (abi, address) => {
    const web3 = await connectMetaMask();
    return new web3.eth.Contract(abi, address);
};
