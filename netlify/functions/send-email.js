// Netlify Function: netlify/functions/send-email.js
// This function securely handles SendGrid API calls with inline image attachments

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    console.log('📧 Received form submission:', data.subject);

    // Get SendGrid API key from environment variable
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      console.error('❌ SENDGRID_API_KEY not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Email service not configured' })
      };
    }

    // Validate required fields
    const { to, subject, htmlContent, replyTo, inlineAttachments } = data;
    if (!to || !subject || !htmlContent) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, htmlContent' })
      };
    }

    // Build SendGrid API request
    const sendgridPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject
        }
      ],
      from: {
        email: 'biscoangelino@gmail.com',
        name: 'Metro Manila Project Forms'
      },
      content: [
        {
          type: 'text/plain',
          value: data.textContent || 'See HTML content'
        },
        {
          type: 'text/html',
          value: htmlContent
        }
      ],
      replyTo: replyTo ? { email: replyTo } : undefined
    };

    // Remove undefined replyTo if not provided
    if (!replyTo) {
      delete sendgridPayload.replyTo;
    }

    // Add inline attachments (images embedded in email, not as separate files)
    if (inlineAttachments && inlineAttachments.length > 0) {
      sendgridPayload.attachments = inlineAttachments.map((att, idx) => ({
        content: att.base64Content,
        type: att.mimeType,
        filename: att.filename,
        disposition: 'inline',
        content_id: att.contentId  // Used by HTML to reference image: <img src="cid:image-id">
      }));
      console.log('📎 Inline attachments:', sendgridPayload.attachments.length);
    }

    console.log('📤 Sending to SendGrid...');
    console.log('   To:', to);
    console.log('   Subject:', subject);

    // Call SendGrid API (using global fetch available in Node.js 18+)
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendgridPayload)
    });

    console.log('📨 SendGrid Response Status:', sendgridResponse.status);

    if
