import MessageModel from '../../models/messages.model';
import { getMessages, saveMessage } from '../../services/message.service';

 
const mockingoose = require('mockingoose');

const message1 = {
  msg: 'Hello',
  msgFrom: 'User1',
  msgDateTime: new Date('2024-06-04'),
};

const message2 = {
  msg: 'Hi',
  msgFrom: 'User2',
  msgDateTime: new Date('2024-06-05'),
};

describe('Message model', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  describe('saveMessage', () => {
    beforeEach(() => {
      mockingoose.resetAll();
    });

    it('should return the saved message', async () => {
      mockingoose(MessageModel).toReturn(message1, 'create');

      const savedMessage = await saveMessage(message1);

      expect(savedMessage).toMatchObject(message1);
    });

    it('should return an error if saving the message fails', async () => {
      jest.spyOn(MessageModel, 'create').mockRejectedValueOnce(new Error('DB error'));
      const result = await saveMessage(message1);
      expect(result).toHaveProperty('error');
      expect((result as any).error).toContain('DB error');
    });

    it('should handle message with special characters', async () => {
      const specialMessage = {
        msg: 'Hello! @#$%^&*()_+ <script>alert("test")</script>',
        msgFrom: 'User1',
        msgDateTime: new Date('2024-06-04'),
      };

      mockingoose(MessageModel).toReturn(specialMessage, 'create');

      const savedMessage = await saveMessage(specialMessage);

      expect(savedMessage).toMatchObject(specialMessage);
    });

    it('should return error with proper error message format', async () => {
      jest.spyOn(MessageModel, 'create').mockRejectedValueOnce(new Error('Validation failed'));

      const result = await saveMessage(message1);

      expect(result).toHaveProperty('error');
      expect((result as any).error).toEqual('Validation failed');
    });

    it('should return error for unknown database errors', async () => {
      jest.spyOn(MessageModel, 'create').mockRejectedValueOnce(new Error());

      const result = await saveMessage(message1);

      expect(result).toHaveProperty('error');
      expect((result as any).error).toEqual('Failed to save message');
    });
  });

  describe('getMessages', () => {
    it('should return all messages, sorted by date', async () => {
      mockingoose(MessageModel).toReturn([message1, message2], 'find');

      const messages = await getMessages();

      expect(messages).toMatchObject([message1, message2]);
    });

    it('should return an empty array if there is a database error', async () => {
      mockingoose(MessageModel).toReturn(new Error('DB error'), 'find');
      const messages = await getMessages();
      expect(messages).toEqual([]);
    });

    it('should return empty array if MessageModel.find returns null', async () => {
      mockingoose(MessageModel).toReturn(null, 'find');

      const messages = await getMessages();

      expect(messages).toEqual([]);
    });

    it('should handle mixed date formats correctly', async () => {
      const messagesWithDifferentDates = [
        {
          msg: 'Old message',
          msgFrom: 'User1',
          msgDateTime: new Date('2020-01-01'),
        },
        {
          msg: 'New message',
          msgFrom: 'User2',
          msgDateTime: new Date('2024-12-31'),
        },
      ];

      mockingoose(MessageModel).toReturn(messagesWithDifferentDates, 'find');

      const messages = await getMessages();

      expect(messages).toHaveLength(2);
      expect(messages).toMatchObject(messagesWithDifferentDates);
    });

    it('should handle messages with same timestamp', async () => {
      const sameTimestamp = new Date('2024-06-04T10:00:00Z');
      const messagesWithSameTime = [
        {
          msg: 'First',
          msgFrom: 'User1',
          msgDateTime: sameTimestamp,
        },
        {
          msg: 'Second',
          msgFrom: 'User2',
          msgDateTime: sameTimestamp,
        },
      ];

      mockingoose(MessageModel).toReturn(messagesWithSameTime, 'find');

      const messages = await getMessages();

      expect(messages).toHaveLength(2);
      expect(messages).toMatchObject(messagesWithSameTime);
    });

    it('should handle database timeout errors gracefully', async () => {
      mockingoose(MessageModel).toReturn(new Error('Connection timeout'), 'find');

      const messages = await getMessages();

      expect(messages).toEqual([]);
    });
  });
});
