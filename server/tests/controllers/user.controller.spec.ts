import supertest from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../app';
import * as util from '../../services/user.service';
import { SafeUser, User } from '../../types/types';

const mockUser: User = {
  _id: new mongoose.Types.ObjectId(),
  username: 'sana',
  password: 'sanaPassword',
  dateJoined: new Date('2023-12-11'),
};

const mockSafeUser: SafeUser = {
  _id: mockUser._id,
  username: 'sana',
  dateJoined: new Date('2023-12-11'),
};

const mockUserJSONResponse = {
  _id: mockUser._id?.toString(),
  username: 'sana',
  dateJoined: new Date('2023-12-11').toISOString(),
};

const saveUserSpy = jest.spyOn(util, 'saveUser');
const loginUserSpy = jest.spyOn(util, 'loginUser');
const updatedUserSpy = jest.spyOn(util, 'updateUser');
const getUserByUsernameSpy = jest.spyOn(util, 'getUserByUsername');
const deleteUserByUsernameSpy = jest.spyOn(util, 'deleteUserByUsername');

describe('Test userController', () => {
  describe('POST /signup', () => {
    it('should create a new user given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
      };

      saveUserSpy.mockResolvedValueOnce(mockSafeUser);

      const response = await supertest(app).post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockUserJSONResponse);
      expect(saveUserSpy).toHaveBeenCalledWith({ ...mockReqBody, dateJoined: expect.any(Date) });
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        password: mockUser.password,
      };

      const response = await supertest(app).post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toEqual('Username and password are required.');
    });

    it('should return 400 for request with missing password', async () => {
      const mockReqBody = { username: 'user2' };

      const response = await supertest(app).post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toEqual('Username and password are required.');
    });

    it('should return 400 if username already exists', async () => {
      saveUserSpy.mockResolvedValueOnce({ error: 'Username already exists' });

      const mockReqBody = { username: mockUser.username, password: mockUser.password };
      const response = await supertest(app).post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Username already exists');
    });

    it('should return 400 for request with empty username', async () => {
      const mockReqBody = {
        username: '',
        password: mockUser.password,
      };

      const response = await supertest(app).post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toEqual('Username and password are required.');
    });

    it('should return 400 for request with empty password', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: '',
      };

      const response = await supertest(app).post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toEqual('Username and password are required.');
    });

    it('should return 500 if an unexpected server error occurs', async () => {
      saveUserSpy.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
      };

      const response = await supertest(app).post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(500);
      expect(response.body.error).toEqual('Server error.');
    });
  });

  describe('POST /login', () => {
    it('should succesfully login for a user given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
      };

      loginUserSpy.mockResolvedValueOnce(mockSafeUser);

      const response = await supertest(app).post('/user/login').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserJSONResponse);
      expect(loginUserSpy).toHaveBeenCalledWith(mockReqBody);
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        password: mockUser.password,
      };

      const response = await supertest(app).post('/user/login').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toEqual('Username and password are required.');
    });

    it('should return 400 if password is missing', async () => {
      const mockReqBody = {
        username: mockUser.username,
      };

      const response = await supertest(app).post('/user/login').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toEqual('Username and password are required.');
    });

    it('should return 401 if credentials are invalid', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: 'wrongpassword',
      };

      loginUserSpy.mockResolvedValueOnce({ error: 'Invalid username or password' });

      const response = await supertest(app).post('/user/login').send(mockReqBody);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid username or password');
    });

    it('should return 400 for request with empty username', async () => {
      const mockReqBody = {
        username: '',
        password: mockUser.password,
      };

      const response = await supertest(app).post('/user/login').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toEqual('Username and password are required.');
    });

    it('should return 400 for request with empty password', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: '',
      };

      const response = await supertest(app).post('/user/login').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toEqual('Username and password are required.');
    });

    it('should return 500 if an unexpected server error occurs during login', async () => {
      loginUserSpy.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
      };

      const response = await supertest(app).post('/user/login').send(mockReqBody);

      expect(response.status).toBe(500);
      expect(response.body.error).toEqual('Server error.');
    });
  });

  describe('PATCH /resetPassword', () => {
    it('should succesfully return updated user object given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: 'newPassword',
      };

      updatedUserSpy.mockResolvedValueOnce(mockSafeUser);

      const response = await supertest(app).patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...mockUserJSONResponse });
      expect(updatedUserSpy).toHaveBeenCalledWith(mockUser.username, { password: 'newPassword' });
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        password: 'newPassword',
      };

      const response = await supertest(app).patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Username and new password are required.');
    });

    it('should return 400 if password is missing', async () => {
      const mockReqBody = { username: mockUser.username };

      const response = await supertest(app).patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Username and new password are required');
    });

    it('should return 404 if user does not exist', async () => {
      updatedUserSpy.mockResolvedValueOnce({ error: 'User not found' });

      const mockReqBody = { username: 'random', password: 'random' };

      const response = await supertest(app).patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('User not found');
    });

    it('should return 400 for request with empty username', async () => {
      const mockReqBody = {
        username: '',
        password: 'newPassword',
      };

      const response = await supertest(app).patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Username and new password are required.');
    });

    it('should return 400 for request with empty password', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: '',
      };

      const response = await supertest(app).patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Username and new password are required.');
    });

    it('should return 500 if an unexpected server error occurs', async () => {
      updatedUserSpy.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const mockReqBody = {
        username: mockUser.username,
        password: 'newPassword',
      };

      const response = await supertest(app).patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(500);
      expect(response.body.error).toEqual('Server error.');
    });
  });

  describe('GET /getUser', () => {
    it('should return the user given correct arguments', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce(mockSafeUser);

      const response = await supertest(app).get(`/user/${mockUser.username}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserJSONResponse);
      expect(getUserByUsernameSpy).toHaveBeenCalledWith(mockUser.username);
    });

    it('should return 404 for non-existent username', async () => {
      getUserByUsernameSpy.mockResolvedValueOnce({ error: 'User not found' });

      const response = await supertest(app).get('/user/randomUser');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('User not found');
    });
  });

  describe('DELETE /deleteUser', () => {
    it('should return the deleted user given correct arguments', async () => {
      deleteUserByUsernameSpy.mockResolvedValueOnce(mockSafeUser);

      const response = await supertest(app).delete(`/user/${mockUser.username}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserJSONResponse);
      expect(deleteUserByUsernameSpy).toHaveBeenCalledWith(mockUser.username);
    });

    it('should return 404 if username not provided', async () => {
      // Express automatically returns 404 for missing parameters when
      // defined as required in the route
      const response = await supertest(app).delete('/user/');
      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent username', async () => {
      deleteUserByUsernameSpy.mockResolvedValueOnce({ error: 'User not found' });

      const response = await supertest(app).delete('/user/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('User not found');
    });

    it('should return 500 if there is a server error', async () => {
      deleteUserByUsernameSpy.mockImplementationOnce(() => {
        throw new Error('Server error');
      });

      const response = await supertest(app).delete(`/user/${mockUser.username}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Server error');
    });
  });
});
