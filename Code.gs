/**
 * Clicks & Clinicians - Google Apps Script
 * This script handles saving session reflections to a Google Sheet
 * and delivering a beautifully formatted HTML/Plain Text email copy to the user.
 * 
 * To deploy this:
 * 1. Open your linked Google Sheet.
 * 2. Click "Extensions" -> "Apps Script".
 * 3. Replace the contents of Code.gs with this code.
 * 4. Click the Save icon (floppy disk).
 * 5. Click "Deploy" -> "New deployment".
 * 6. Select type "Web app". Set Execute as "Me", and Who has access to "Anyone".
 * 7. Copy the Web App URL and configure it as the GOOGLE_APPS_SCRIPT_URL in your server.
 */

function doPost(e) {
  try {
    // 1. Parse the incoming JSON payload
    var data = JSON.parse(e.postData.contents);
    
    // 2. Save reflection data to Google Sheets (Preserving existing structure)
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var timestamp = data.timestamp || new Date().toISOString();
    
    // Append the row in standard order:
    // SessionID, Timestamp, Q1Scenario, Q2Theme, Q3ReflectionNeed, PromptID, PromptType, AppVersion, ReflectionText, Email, ConsentToEmail
    sheet.appendRow([
      data.sessionId || "",
      timestamp,
      data.q1Scenario || "",
      data.q2Theme || "",
      data.q3ReflectionNeed || "",
      data.promptId || "",
      data.promptType || "",
      data.appVersion || "1.0",
      data.reflectionText || "",
      data.email || "",
      data.consentToEmail ? "TRUE" : "FALSE"
    ]);

    // 3. Handle Email Delivery if user consented and provided a valid email
    if (data.consentToEmail && data.email && data.email.trim().length > 0) {
      sendReflectionEmail(data);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      sessionId: data.sessionId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Generates and sends a beautifully formatted email (HTML + Plain Text fallback)
 * @param {Object} data - The parsed request payload
 */
function sendReflectionEmail(data) {
  var recipient = data.email.trim();
  var subject = "Your Clicks & Clinicians Session Reflection";
  
  // Format the date nicely (e.g., July 20, 2026)
  var formattedDate = "";
  try {
    var rawDate = new Date(data.timestamp || new Date());
    // Format nicely using Utilities.formatDate
    formattedDate = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), "MMMM d, yyyy");
  } catch (err) {
    formattedDate = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
  }

  var sessionId = data.sessionId || "N/A";
  var framingSentence = data.q2FramingSentence || data.framingSentence || "";
  var promptText = data.promptText || "";
  var reflectionText = (data.reflectionText && data.reflectionText.trim().length > 0) 
    ? data.reflectionText.trim() 
    : "No written reflection was entered.";

  // --- 1. PLAIN TEXT BODY FALLBACK ---
  var textBody = "CLICKS & CLINICIANS\n" +
                 "Session Reflection\n\n" +
                 "Hi,\n\n" +
                 "Here is a copy of your Clicks & Clinicians reflection.\n\n" +
                 "Reflection completed: " + formattedDate + "\n\n" +
                 "Framing Sentence:\n" + framingSentence + "\n\n" +
                 "Reflection Prompt:\n" + promptText + "\n\n" +
                 "My Written Reflection:\n" + reflectionText + "\n\n" +
                 "Thank you for participating in Clicks & Clinicians.\n" +
                 "We hope this reflection continues to support your professional thinking.\n\n" +
                 "— The Clicks & Clinicians Team\n\n" +
                 "Session ID: " + sessionId;

  // --- 2. HTML BODY (BEAUTIFUL EMERALD STYLING MATCHING THE PDF) ---
  var htmlBody = 
    '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; line-height: 1.6; max-width: 600px; margin: 0 auto; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05);">' +
      // Header Banner (Deep Emerald)
      '<div style="background-color: #064e3b; padding: 32px 24px; border-radius: 8px 8px 0 0; color: #ffffff; text-align: left; margin-bottom: 24px;">' +
        '<h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.025em; line-height: 1.2;">Clicks & Clinicians</h1>' +
        '<p style="margin: 4px 0 0 0; font-size: 14px; color: #a7f3d0; font-weight: 500;">Session Reflection</p>' +
      '</div>' +
      
      // Main Body Box
      '<div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px 24px; margin-bottom: 24px;">' +
        // Greeting
        '<p style="margin-top: 0; margin-bottom: 20px; font-size: 15px; color: #334155;">Hi,</p>' +
        '<p style="margin-bottom: 24px; font-size: 15px; color: #334155;">Here is a copy of your Clicks & Clinicians reflection.</p>' +
        
        // Date Block
        '<p style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.05em;">' +
          'Reflection completed: <span style="color: #0f172a; font-weight: normal;">' + formattedDate + '</span>' +
        '</p>' +
        
        // Divider
        '<hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />' +
        
        // Reflection Prompt Section
        '<h3 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; font-weight: 700; color: #0f172a;">Reflection Prompt Details</h3>' +
        
        // Framing Sentence
        '<p style="font-size: 14px; font-style: italic; color: #334155; margin-bottom: 16px; line-height: 1.5;">' +
          framingSentence +
        '</p>' +
        
        // Prompt Text Box
        '<div style="background-color: #f8fafc; border-left: 4px solid #064e3b; padding: 16px; border-radius: 0 6px 6px 0; margin-bottom: 28px;">' +
          '<p style="margin: 0; font-size: 14px; font-weight: 700; color: #064e3b; line-height: 1.5;">' +
            promptText +
          '</p>' +
        '</div>' +
        
        // Written Reflection Section
        '<h3 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; font-weight: 700; color: #0f172a;">My Written Reflection</h3>' +
        '<div style="background-color: #fafaf9; border: 1px solid #f5f5f4; padding: 18px; border-radius: 6px; font-size: 14px; color: #44403c; line-height: 1.6; min-height: 80px; white-space: pre-wrap;">' +
          reflectionText +
        '</div>' +
        
        // Closing Block
        '<div style="margin-top: 32px; font-size: 14px; color: #334155; border-top: 1px solid #f1f5f9; padding-top: 24px;">' +
          '<p style="margin-top: 0; margin-bottom: 8px;">Thank you for participating in Clicks & Clinicians.</p>' +
          '<p style="margin-bottom: 16px;">We hope this reflection continues to support your professional thinking.</p>' +
          '<p style="margin-bottom: 0; font-weight: 600; color: #064e3b;">— The Clicks & Clinicians Team</p>' +
        '</div>' +
      '</div>' +
      
      // Footer Block (Session ID)
      '<div style="text-align: center; font-size: 11px; color: #94a3b8;">' +
        '<p style="margin: 0;">Session ID: ' + sessionId + '</p>' +
      '</div>' +
    '</div>';

  // Send email via Google Apps Script MailApp API
  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: textBody,
    htmlBody: htmlBody
  });
}
