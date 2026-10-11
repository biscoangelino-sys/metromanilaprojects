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
    const { to, subject, htmlContent, replyTo, cc, inlineAttachments } = data;
    if (!to || !subject || !htmlContent) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, htmlContent' })
      };
    }

    // Build personalizations with optional CC
    const personalizations = {
      to: [{ email: to }],
      subject: subject
    };

    // Add CC if provided
    if (cc) {
      personalizations.cc = [{ email: cc }];
    }

    // Build SendGrid API request
    const sendgridPayload = {
      personalizations: [personalizations],
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

    // Add attachments (both inline images and regular file attachments)
    if (inlineAttachments && inlineAttachments.length > 0) {
      sendgridPayload.attachments = inlineAttachments.map((att) => {
        const attachment = {
          content: att.base64Content,
          type: att.mimeType,
          filename: att.filename,
          disposition: att.disposition || 'attachment'
        };
        // Only add content_id for inline images
        if (att.disposition === 'inline' && att.contentId) {
          attachment.content_id = att.contentId;
        }
        return attachment;
      });
      console.log('📎 Attachments:', sendgridPayload.attachments.length);
    }

    console.log('📤 Sending to SendGrid...');
    console.log('   To:', to);
    if (cc) console.log('   CC:', cc);
    console.log('   Subject:', subject);

    // Call SendGrid API
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
        recipient: to,
        cc: cc || null
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
