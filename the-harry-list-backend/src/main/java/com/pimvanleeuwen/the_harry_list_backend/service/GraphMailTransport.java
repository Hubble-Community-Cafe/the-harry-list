package com.pimvanleeuwen.the_harry_list_backend.service;

import com.microsoft.graph.models.Attachment;
import com.microsoft.graph.models.BodyType;
import com.microsoft.graph.models.EmailAddress;
import com.microsoft.graph.models.FileAttachment;
import com.microsoft.graph.models.ItemBody;
import com.microsoft.graph.models.Message;
import com.microsoft.graph.models.Recipient;
import com.microsoft.graph.serviceclient.GraphServiceClient;
import com.microsoft.graph.users.item.sendmail.SendMailPostRequestBody;
import com.pimvanleeuwen.the_harry_list_backend.model.EmailAttachment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

/**
 * Production delivery: sends through Microsoft Graph from the shared no-reply mailbox and
 * keeps a copy in its Sent Items. Never logs recipients (logs go to Loki).
 */
public class GraphMailTransport implements MailTransport {

    private static final Logger log = LoggerFactory.getLogger(GraphMailTransport.class);

    private final GraphServiceClient graphClient;
    private final String fromEmail;

    public GraphMailTransport(GraphServiceClient graphClient, String fromEmail) {
        this.graphClient = graphClient;
        this.fromEmail = fromEmail;
    }

    @Override
    public void send(OutgoingEmail email) {
        Message message = new Message();
        message.setSubject(email.subject());

        ItemBody body = new ItemBody();
        body.setContentType(BodyType.Html);
        body.setContent(email.htmlBody());
        message.setBody(body);

        message.setToRecipients(new LinkedList<>(List.of(recipient(email.to()))));
        if (email.replyTo() != null && !email.replyTo().isBlank()) {
            message.setReplyTo(new LinkedList<>(List.of(recipient(email.replyTo()))));
        }
        if (!email.attachments().isEmpty()) {
            List<Attachment> files = new ArrayList<>();
            for (EmailAttachment attachment : email.attachments()) {
                FileAttachment file = new FileAttachment();
                file.setOdataType("#microsoft.graph.fileAttachment");
                file.setName(attachment.getFilename());
                file.setContentType(attachment.getContentType());
                file.setContentBytes(attachment.getData());
                files.add(file);
            }
            message.setAttachments(files);
        }

        SendMailPostRequestBody request = new SendMailPostRequestBody();
        request.setMessage(message);
        request.setSaveToSentItems(true);

        try {
            graphClient.users().byUserId(fromEmail).sendMail().post(request);
        } catch (RuntimeException e) {
            throw new IllegalStateException("Microsoft Graph could not send the email", e);
        }
        log.info("Email sent via Microsoft Graph with {} attachment(s)", email.attachments().size());
    }

    private static Recipient recipient(String address) {
        EmailAddress emailAddress = new EmailAddress();
        emailAddress.setAddress(address);
        Recipient recipient = new Recipient();
        recipient.setEmailAddress(emailAddress);
        return recipient;
    }
}
