import mongoose from 'mongoose';
import supertest from 'supertest';
import { app } from '../../app';
import * as util from '../../services/message.service';

const saveMessageSpy = jest.spyOn(util, 'saveMessage');
const getMessagesSpy = jest.spyOn(util, 'getMessages');

describe('POST /addMessage', () => {
  it('should add a new message', async () => {
    const validId = new mongoose.Types.ObjectId();
    const message = {
      _id: validId,
      msg: 'Hello',
      msgFrom: 'sana',
      msgDateTime: new Date('2024-06-04'),
    };

    saveMessageSpy.mockResolvedValue(message);

    const response = await supertest(app)
      .post('/messaging/addMessage')
      .send({ messageToAdd: message });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      _id: message._id.toString(),
      msg: message.msg,
      msgFrom: message.msgFrom,
      msgDateTime: message.msgDateTime.toISOString(),
    });
  });

  it('should return bad request error if messageToAdd is missing', async () => {
    const response = await supertest(app).post('/messaging/addMessage').send({});

    expect(response.status).toBe(400);
  });

  it('should return 400 if messageToAdd has missing msg field', async () => {
    const invalidMessage = {
      msgFrom: 'User1',
      msgDateTime: new Date('2024-06-04'),
    };

    const response = await supertest(app)
      .post('/messaging/addMessage')
      .send({ messageToAdd: invalidMessage });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid message body');
  });

  it('should return 500 if saving message fails', async () => {
    const validMsg = {
      msg: 'ErrorTest',
      msgFrom: 'User1',
      msgDateTime: new Date('2024-06-04'),
    };
    saveMessageSpy.mockResolvedValueOnce({ error: 'DB error' });

    const response = await supertest(app)
      .post('/messaging/addMessage')
      .send({ messageToAdd: validMsg });

    expect(response.status).toBe(500);
    expect(response.body.error).toContain('DB error');
  });

  it('should return 400 if messageToAdd has missing msgFrom field', async () => {
    const invalidMessage = {
      msg: 'Hello',
      msgDateTime: new Date('2024-06-04'),
    };

    const response = await supertest(app)
      .post('/messaging/addMessage')
      .send({ messageToAdd: invalidMessage });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid message body');
  });

  it('should return 400 if messageToAdd has missing msgDateTime field', async () => {
    const invalidMessage = {
      msg: 'Hello',
      msgFrom: 'User1',
    };

    const response = await supertest(app)
      .post('/messaging/addMessage')
      .send({ messageToAdd: invalidMessage });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid message body');
  });

  it('should handle very long message text', async () => {
    const longText = 'a'.repeat(1000);
    const message = {
      msg: longText,
      msgFrom: 'User1',
      msgDateTime: new Date('2024-06-04'),
    };

    saveMessageSpy.mockResolvedValue(message);

    const response = await supertest(app)
      .post('/messaging/addMessage')
      .send({ messageToAdd: message });

    expect(response.status).toBe(201);
    expect(response.body.msg).toBe(longText);
  });

  it('should return 400 if messageToAdd has empty msgFrom field', async () => {
    const invalidMessage = {
      msg: 'Hello',
      msgFrom: '',
      msgDateTime: new Date('2024-06-04'),
    };

    const response = await supertest(app)
      .post('/messaging/addMessage')
      .send({ messageToAdd: invalidMessage });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid message body');
  });
});

describe('GET /getMessages', () => {
  it('should return all messages', async () => {
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

    getMessagesSpy.mockResolvedValue([message1, message2]);

    const response = await supertest(app).get('/messaging/getMessages');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        msg: message1.msg,
        msgFrom: message1.msgFrom,
        msgDateTime: message1.msgDateTime.toISOString(),
      },
      {
        msg: message2.msg,
        msgFrom: message2.msgFrom,
        msgDateTime: message2.msgDateTime.toISOString(),
      },
    ]);
  });

  it('should return 500 if getMessages throws error', async () => {
    getMessagesSpy.mockRejectedValueOnce(new Error('DB error'));
    const response = await supertest(app).get('/messaging/getMessages');
    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Failed to fetch messages');
  });

  it('should return empty array if no messages exist', async () => {
    getMessagesSpy.mockResolvedValue([]);

    const response = await supertest(app).get('/messaging/getMessages');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('should return messages in correct chronological order', async () => {
    const olderMessage = {
      msg: 'First message',
      msgFrom: 'User1',
      msgDateTime: new Date('2024-06-04'),
    };

    const newerMessage = {
      msg: 'Second message',
      msgFrom: 'User2',
      msgDateTime: new Date('2024-06-05'),
    };

    getMessagesSpy.mockResolvedValue([olderMessage, newerMessage]);

    const response = await supertest(app).get('/messaging/getMessages');

    expect(response.status).toBe(200);
    expect(response.body[0].msgDateTime).toBe(olderMessage.msgDateTime.toISOString());
    expect(response.body[1].msgDateTime).toBe(newerMessage.msgDateTime.toISOString());
  });

  it('should handle large number of messages', async () => {
    const manyMessages = Array.from({ length: 100 }, (_, i) => ({
      msg: `Message ${i}`,
      msgFrom: `User${i}`,
      msgDateTime: new Date(`2024-06-${String((i % 28) + 1).padStart(2, '0')}`),
    }));

    getMessagesSpy.mockResolvedValue(manyMessages);

    const response = await supertest(app).get('/messaging/getMessages');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(100);
  });
});
