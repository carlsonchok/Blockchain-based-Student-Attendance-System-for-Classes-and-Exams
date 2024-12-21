module.exports = {
  networks: {
    development: {
      host: "127.0.0.1", // Localhost (Ganache)
      port: 7545,        // Port Ganache runs on
      network_id: "*",   // Match any network ID
    },
  },

  // Solidity compiler settings
  compilers: {
    solc: {
      version: "0.8.0", // Match the version of Solidity used in your smart contract
    },
  },
};
