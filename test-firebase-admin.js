const admin = require('firebase-admin');
const path = require('path');

// Replace with the path to your service account key JSON file
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Optionally, add databaseURL if you use Realtime Database
  // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com"
});

async function testConnection() {
  try {
    // Try to get the project info
    const projectId = admin.app().options.credential.projectId;
    console.log('Firebase Admin initialized for project:', projectId);

    // Try to list users (as a simple API call)
    const listUsersResult = await admin.auth().listUsers(1);
    console.log('Successfully connected! Example user:', listUsersResult.users[0] || 'No users found');
  } catch (err) {
    console.error('Firebase Admin connection failed:', err);
    process.exit(1);
  }
}

testConnection(); 