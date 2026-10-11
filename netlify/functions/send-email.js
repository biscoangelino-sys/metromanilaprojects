// Netlify Function: netlify/functions/send-email.js
// This function securely handles SendGrid API calls from the form

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
    const { to, subject, htmlContent, replyTo } = data;
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

    // Only include attachments if there are any
    const attachments = data.attachments || [];
    if (attachments.length > 0) {
      sendgridPayload.attachments = attachments;
    }

    // Remove undefined replyTo if not provided
    if (!replyTo) {
      delete sendgridPayload.replyTo;
    }

    console.log('📤 Sending to SendGrid...');
    console.log('   To:', to);
    console.log('   Subject:', subject);
    console.log('   Attachments:', attachments.length);

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

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      console.error('❌ SendGrid Error:', sendgridResponse.status, errorText);
      return {
        statusCode: sendgridResponse.status,
        body: JSON.stringify({
          error: 'SendGrid API error',
          details: errorText
        })
      };
    }

    console.log('✅ Email sent successfully via SendGrid');
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        recipient: to
      })
    };

  } catch (error) {
    console.error('❌ Function Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
