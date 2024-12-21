// Hardcoded user data
const users = {
  admins: [
      { username: "admin", password: "adminpass" } // Example admin credentials
  ],
  students: [
      { username: "student1", password: "pass123", name: "Alice" },
      { username: "student2", password: "pass456", name: "Bob" }
  ]
};

// Validate Admin Credentials
export const validateAdmin = (username, password) => {
  return users.admins.some(admin => admin.username === username && admin.password === password);
};

// Validate Student Credentials
export const validateStudent = (username, password) => {
  return users.students.find(student => student.username === username && student.password === password);
};
