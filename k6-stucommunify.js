import http from "k6/http";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { sleep, check } from 'k6';
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js"; // Import UUID generator

// Options to control the load profile
export const options = {
    stages: [
        { duration: '30s', target: 10 }, // Ramp-up to 10 VUs over 30 seconds
        { duration: '1m', target: 10 },  // Stay at 10 VUs for 1 minute
        { duration: '10s', target: 0 },  // Ramp-down to 0 VUs over 10 seconds
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],  // 95% of requests must complete below 500ms
    },
};

// Set the Base URL for your API
const BASE_URL = 'https://api-dev.stucommunify.co.uk/v1';

// Define the bearer token (replace with your actual token)
const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImIyNDBiODhhLTcwOTctNDE5YS1iMDhjLTBkYWJiMzc5YWJmYyIsImVtYWlsIjoic3VwZXJhZG1pbkBtYWlsLmNvbSIsIm5hbWUiOiJTdHVDb21tdW5pZnkiLCJ2ZXJpZmllZCI6dHJ1ZSwiZW5hYmxlVHdvRmFjdG9yQXV0aGVudGljYXRpb24iOmZhbHNlLCJpc1N1cGVyQWRtaW4iOnRydWUsInN0YXR1cyI6MSwidXNlclR5cGUiOiJhZG1pbiIsIm9yZ2FuaXphdGlvblVzZXJUeXBlIjpudWxsLCJpYXQiOjE3MjYzNDEzMDIsImV4cCI6MTcyNjQyNzcwMn0.BLpf9jyQYqZNELnFIehRdHBZnhFdqs5ds-OhJOsqoqA';

// Global variable to hold the post ID and an array of comment IDs
let postId = null;
let commentIds = [];

// Setup function to create a post before the load test starts
export function setup() {
    // 1. Create a Post
    const postUrl = `${BASE_URL}/social-post`;  // Using the base URL

    const postData = JSON.stringify({
        "category": "social-engagement",
        "post": "Hello from k6 genearting Load test",
        "statusBackgroundColor": {},
        "images": [
            {
                "imagePath": "socialPost/b240b88a-7097-419a-b08c-0dabb379abfc/149e1856-207d-45e0-a775-c26afd739ed1-new.jpeg"
            }
        ]
    });

    const postParams = {
        headers: {
            Authorization: `Bearer ${BEARER_TOKEN}`,
            'Content-Type': 'application/json',
        },
    };

    const postRes = http.post(postUrl, postData, postParams);

    check(postRes, {
        'post creation status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    });

    // Parse the response body to extract the post ID
    const createdPostId = JSON.parse(postRes.body).payload.id;  // Extract only the "id"
    console.log(`Post ID: ${createdPostId}`);

    // Return the post ID to be used in the default function
    return { postId: createdPostId };
}

export default function (data) {
    // 2. Write Random Comments using the postId from setup
    postId = data.postId;

    const commentUrl = `${BASE_URL}/social-post-activity/${postId}/comment`;  // Using the base URL

    // Example list of random comments
    const randomComments = [
        "This is an awesome post!",
        "Nice content, keep it up!",
        "I totally agree with your post.",
        "This is really insightful, thanks for sharing!",
        "Interesting perspective, I hadn't thought about it this way."
    ];

    // Generate a random comment
    const randomComment = randomComments[Math.floor(Math.random() * randomComments.length)];

    // Generate a new UUID for each comment
    const commentId = uuidv4();

    const commentData = JSON.stringify({
        "id": commentId,               // Generated UUID for the comment
        "parentCommentId": "",         // This is a top-level comment, no parent
        "comment": randomComment        // The random comment
    });

    const commentParams = {
        headers: {
            Authorization: `Bearer ${BEARER_TOKEN}`,
            'Content-Type': 'application/json',
        },
    };

    const commentRes = http.post(commentUrl, commentData, commentParams);

    check(commentRes, {
        'comment creation status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    });

    // Store the comment ID for replies
    if (commentRes.status === 201 || commentRes.status === 200) {
        commentIds.push(commentId);
    }

    // Simulate a pause between requests
    // sleep(1);

    // 3. Write Replies to Random Comments
    if (commentIds.length > 0) {
        const parentCommentId = commentIds[Math.floor(Math.random() * commentIds.length)]; // Pick a random comment to reply to
        const replyId = uuidv4();  // Generate a new UUID for the reply

        const replyData = JSON.stringify({
            "id": replyId,                // Generated UUID for the reply
            "parentCommentId": parentCommentId,  // Parent comment ID
            "comment": "This is a reply to a comment."  // Fixed reply message, you can randomize if needed
        });

        const replyRes = http.post(commentUrl, replyData, commentParams);

        check(replyRes, {
            'reply creation status is 201 or 200': (r) => r.status === 201 || r.status === 200,
        });

        // Simulate a pause between requests
        // sleep(1);
    }
}

// Summary reporting for HTML and text
export function handleSummary(data) {
    return {
        "summary.html": htmlReport(data),
        "summary.txt": textSummary(data, { indent: " ", enableColors: true }),
    };
}
