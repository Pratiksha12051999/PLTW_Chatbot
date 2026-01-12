# User Guide

This guide provides step-by-step instructions for using the PLTW Support Assistant (Jordan).

---

## Prerequisites

**Please ensure the application is deployed before proceeding.** 

See the [Deployment Guide](./deploymentGuide.md) for deployment instructions.

---

## Introduction

The PLTW Support Assistant (Jordan) is an AI-powered conversational assistant that helps US PreK-12 educators get instant answers about PLTW curriculum implementation, product purchasing, training, assessments, payment, rostering, grants, and technical guidance using Amazon Bedrock Agent technology.

The chatbot is designed to serve as the first line of customer support for educators, including District and School administrators, CTE directors, and teachers using Project Lead The Way (PLTW) curriculum.

### Key Features
- **Real-time AI Responses**: WebSocket-based streaming for natural conversation flow
- **Knowledge Base Integration**: Answers powered by PLTW documentation (pltw.org, knowledge.pltw.org)
- **Source Citations**: Clickable links to websites and document references below responses
- **File Attachment Support**: Upload PDFs, Word docs, and images for analysis
- **Feedback System**: Rate responses to help improve the chatbot
- **Escalation Detection**: Automatic detection when human support is needed
- **Admin Dashboard**: Analytics and conversation monitoring for staff

---

## Getting Started

### Step 1: Access the Application

Navigate to the application URL provided after deployment (the Amplify App URL).

**Example**: `https://master.xxxxxxxxxx.amplifyapp.com`

When you first open the chatbot, you'll see:
- The PLTW logo and Jordan branding
- A welcome message explaining what the chatbot can help with
- A chat input field at the bottom
- The main chat interface

---

### Step 2: Start a Conversation

Type your question in the input field at the bottom of the screen, then press Enter or click the send button.

**Example questions:**
- "How do I get started with PLTW curriculum?"
- "What training options are available for teachers?"
- "How do I roster students in my account?"
- "What payment options are available?"
- "Are there grants available for PLTW programs?"

---

### Step 3: View the Response

As Jordan responds, you'll see:

1. **Your Message**: Displayed on the right side of the chat
2. **Typing Indicator**: Shows Jordan is processing your question
3. **Jordan's Response**: Displayed on the left side with relevant information
4. **Source Citations**: Clickable links and document references below the response
5. **Confidence Indicator**: Jordan may suggest escalation if confidence is low

---

### Step 4: Attach Files (Optional)

You can attach files to your messages for Jordan to analyze:

**Steps:**
1. Click the attachment icon (📎) in the chat input area
2. Select a file from your device
3. Wait for the upload to complete
4. Type your question about the file and send

**Supported file types:**
- PDF documents (`.pdf`)
- Word documents (`.doc`, `.docx`)
- Images (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`)
- Text files (`.txt`)

**Maximum file size:** 10MB

Jordan will extract and analyze the content from your uploaded files to provide relevant answers.

---

### Step 5: Provide Feedback

Help improve Jordan by rating responses:

1. Look for the **👍** and **👎** buttons below each response
2. Click thumbs up if the answer was helpful
3. Click thumbs down if the answer was incorrect or unhelpful
4. Optionally add a comment explaining your feedback

Your feedback helps the PLTW team identify areas for improvement.

---

### Step 6: Escalation to Human Support

If Jordan cannot answer your question adequately:

**Automatic Escalation:**
- Jordan will detect low-confidence responses
- You'll see contact information for the PLTW Solution Center

**Manual Escalation:**
- If you need human support, Jordan will provide contact details:
  - **Phone**: 877.335.7589
  - **Email**: solutioncenter@pltw.org

---

## Common Use Cases

### Use Case 1: Getting Started with PLTW

Learn how to implement PLTW curriculum in your school or district.

**Steps:**
1. Ask: "How do I get started with PLTW?"
2. Follow up with specific questions:
   - "What programs are available for elementary schools?"
   - "What are the requirements for launching a PLTW program?"
   - "How long does implementation take?"

---

### Use Case 2: Training and Certification

Find information about professional development and teacher training.

**Steps:**
1. Ask: "What training is required for PLTW teachers?"
2. Ask follow-up questions:
   - "When are the next training sessions?"
   - "How do I register for training?"
   - "What certifications do I need?"

---

### Use Case 3: Rostering and Account Management

Get help with student and teacher account setup.

**Steps:**
1. Ask: "How do I roster students in PLTW?"
2. Ask specific questions:
   - "How do I add a new teacher to my account?"
   - "How do I import student data?"
   - "How do I reset a student's password?"

---

### Use Case 4: Payment and Billing

Understand pricing and payment options.

**Steps:**
1. Ask: "What are the payment options for PLTW?"
2. Ask follow-up questions:
   - "How much does PLTW cost per student?"
   - "When are invoices sent?"
   - "How do I update billing information?"

---

### Use Case 5: Grants and Funding

Explore funding opportunities for PLTW programs.

**Steps:**
1. Ask: "Are there grants available for PLTW?"
2. Ask specific questions:
   - "What grants can help fund PLTW implementation?"
   - "How do I apply for PLTW grants?"
   - "What are the eligibility requirements?"

---

### Use Case 6: Analyzing Documents

Upload documents for Jordan to analyze and answer questions about.

**Steps:**
1. Click the attachment icon
2. Upload your document (PDF, Word, etc.)
3. Ask: "Can you summarize this document?"
4. Ask follow-up questions about the content

---

## Tips and Best Practices

- **Be Specific**: The more specific your question, the better the answer. "How do I roster 10th grade students?" works better than "How do I roster?"
- **Ask Follow-ups**: Jordan maintains conversation context, so you can ask follow-up questions naturally
- **Use File Attachments**: Upload documents you need help understanding or analyzing
- **Provide Feedback**: Use thumbs up/down to help improve Jordan's responses
- **Check Escalation**: If Jordan suggests escalation, consider contacting the Solution Center directly

---

## Frequently Asked Questions (FAQ)

### Q: How accurate is Jordan's information?
**A:** Jordan pulls information directly from official PLTW documentation including pltw.org and knowledge.pltw.org. However, always verify time-sensitive information by contacting the Solution Center directly.

### Q: Can I purchase PLTW products through Jordan?
**A:** Jordan cannot process transactions directly, but can provide information about pricing and direct you to the appropriate purchasing channels.

### Q: Why did Jordan say it doesn't know something?
**A:** Jordan only answers questions based on information in its knowledge base. If it doesn't have information about something, it will let you know and suggest contacting the Solution Center.

### Q: Is my conversation private?
**A:** Conversations are stored for analytics and improvement purposes. Personal information is handled according to PLTW's privacy policy.

### Q: How do I report an incorrect answer?
**A:** Use the thumbs down (👎) button to flag unhelpful or incorrect responses. This feedback helps the team improve Jordan.

### Q: Can I continue a conversation later?
**A:** Conversations are maintained during your browser session. If you close the browser, the conversation history will be cleared.

### Q: What file types can I upload?
**A:** Jordan supports PDF, Word (.doc, .docx), images (JPEG, PNG, GIF, WebP), and text files up to 10MB.

---

## Troubleshooting

### Issue: Jordan is not responding
**Solution:** 
- Check your internet connection
- Try refreshing the page
- Clear your browser cache and try again
- If the issue persists, the service may be temporarily unavailable

### Issue: Responses are very slow
**Solution:**
- Responses may take a few seconds, especially for complex questions
- Check your internet connection speed
- Try a simpler question to test

### Issue: File upload failed
**Solution:**
- Ensure your file is under 10MB
- Check that the file type is supported (PDF, Word, images, text)
- Try uploading a different file
- Refresh the page and try again

### Issue: WebSocket connection failed
**Solution:**
- Check your internet connection
- Ensure your firewall allows WebSocket connections
- Try refreshing the page
- Try a different browser

### Issue: Feedback submission failed
**Solution:**
- Ensure you're connected to the internet
- Try again in a few moments
- Refresh the page if the issue persists

---

## Admin Dashboard (Staff Only)

PLTW staff can access the admin dashboard to view analytics and conversation history.

### Accessing the Dashboard

1. Navigate to `/admin` on the application URL
2. Sign in with your Cognito credentials
3. You'll see the admin dashboard

### Dashboard Features

- **Total Conversations**: Number of chat sessions in the selected period
- **Escalation Rate**: Percentage of conversations requiring human support
- **Overall Satisfaction**: Percentage of positive feedback received
- **Conversation Volume Chart**: Line chart showing daily conversation counts
- **Escalation Reasons Chart**: Donut chart breaking down escalation reasons
- **Top Categories Chart**: Bar chart showing most common question topics
- **User Satisfaction Chart**: Donut chart showing positive vs negative feedback

### Time Period Selection

Filter dashboard data by:
- Last 7 Days
- Last 30 Days
- Last 3 Months
- All Time

### Viewing Conversation Details

1. Scroll to the **Recent Conversations** table
2. Click on any conversation row to view full details
3. See the complete message history in a modal
4. View conversation status, category, and feedback

---

## Getting Help

If you encounter issues not covered in this guide:

- **For educators**: Contact the PLTW Solution Center at 877.335.7589 or solutioncenter@pltw.org
- **For technical issues**: Contact your system administrator
- **For developers**: See the [Modification Guide](./modificationGuide.md)

---

## Next Steps

- Explore the [API Documentation](./APIDoc.md) for programmatic access
- Check the [Architecture Deep Dive](./architectureDeepDive.md) to understand how the system works
- See the [Modification Guide](./modificationGuide.md) if you want to customize the application
