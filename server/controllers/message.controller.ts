import express, { Response, Request } from 'express';
import { FakeSOSocket } from '../types/socket';
import { AddMessageRequest, Message } from '../types/types';
import { saveMessage, getMessages } from '../services/message.service';

const messageController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Checks if the provided message request contains the required fields.
   *
   * @param req The request object containing the message data.
   *
   * @returns `true` if the request is valid, otherwise `false`.
   */
  const isRequestValid = (req: AddMessageRequest): boolean => {
    const msg = req.body.messageToAdd;
    return !!msg && !!msg.msg && !!msg.msgFrom && !!msg.msgDateTime;
  };

  /**
   * Validates the Message object to ensure it contains the required fields.
   *
   * @param message The message to validate.
   *
   * @returns `true` if the message is valid, otherwise `false`.
   */
  const isMessageValid = (message: Message): boolean => {
    return !!message && !!message.msg && !!message.msgFrom && !!message.msgDateTime;
  };

  /**
   * Handles adding a new message. The message is first validated and then saved.
   * If the message is invalid or saving fails, the HTTP response status is updated.
   *
   * @param req The AddMessageRequest object containing the message and chat data.
   * @param res The HTTP response object used to send back the result of the operation.
   *
   * @returns A Promise that resolves to void.
   */
  const addMessageRoute = async (req: AddMessageRequest, res: Response): Promise<void> => {
    if (!isRequestValid(req)) {
      res.status(400).json({ error: 'Invalid message body' });
      return;
    }
    const messageToAdd = req.body.messageToAdd;
    if (!isMessageValid(messageToAdd)) {
      res.status(400).json({ error: 'Invalid message object' });
      return;
    }

    try {
      const msgFromDb = await saveMessage(messageToAdd);
      if ('error' in msgFromDb) {
        res.status(500).json(msgFromDb);
        return;
      }
      socket.emit('messageUpdate', { msg: msgFromDb });
      res.status(201).json(msgFromDb);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save message' });
    }
  };

  /**
   * Fetch all messages in descending order of their date and time.
   * @param req The request object.
   * @param res The HTTP response object used to send back the messages.
   * @returns A Promise that resolves to void.
   */
  const getMessagesRoute = async (req: Request, res: Response): Promise<void> => {
    try {
      const messages = await getMessages();
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  };

  // Add appropriate HTTP verbs and their endpoints to the router
  router.post('/addMessage', addMessageRoute);
  router.get('/getMessages', getMessagesRoute);

  return router;
};

export default messageController;
