const admin = require('firebase-admin');
const path = require('path');

// Use your service account key
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// TODO: Paste your FCM token here
const fcmToken = 'c3mQhTCUrihokY7JdH00Ex:APA91bHj70DJdSbSDaXP_IZKDaRext7y3_dT4BBMhN46UGsrOM3jU8l72fo8ALw-QeaAmKt89vuo8z5rk9RClVT9u-eE1pCLHUenyFEk-DcqEYaxwSuBye4';

const message = {
  notification: {
    title: 'Test Notification',
    body: 'This is a test push notification from Node.js!',
  },
  token: fcmToken,
};

if (fcmToken === 'PASTE_YOUR_FCM_TOKEN_HERE') {
  console.error('Please paste your FCM token into send-fcm-test.js before running this script.');
  process.exit(1);
}

admin.messaging().send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.error('Error sending message:', error);
  }); 