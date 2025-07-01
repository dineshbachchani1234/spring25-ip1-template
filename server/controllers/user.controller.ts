import express, { Response, Router } from 'express';
import { UserRequest, User, UserCredentials, UserByUsernameRequest } from '../types/types';
import {
  deleteUserByUsername,
  getUserByUsername,
  loginUser,
  saveUser,
  updateUser,
} from '../services/user.service';

const userController = () => {
  const router: Router = express.Router();

  /**
   * Validates that the request body contains all required fields for a user.
   * @param req The incoming request containing user data.
   * @returns `true` if the body contains valid user fields; otherwise, `false`.
   */
  const isUserBodyValid = (req: UserRequest): boolean => {
    return !!req.body.username && !!req.body.password;
  };

  /**
   * Handles the creation of a new user account.
   * @param req The request containing username, email, and password in the body.
   * @param res The response, either returning the created user or an error.
   * @returns A promise resolving to void.
   */
  const createUser = async (req: UserRequest, res: Response): Promise<void> => {
    if (!isUserBodyValid(req)) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }
    try {
      const userToSave: User = {
        username: req.body.username,
        password: req.body.password,
        dateJoined: new Date(),
      };
      const result = await saveUser(userToSave);
      if ('error' in result) {
        res.status(400).json({ error: result.error });
      } else {
        res.status(201).json(result); // SafeUser (without password)
      }
    } catch (error) {
      res.status(500).json({ error: 'Server error.' });
    }
  };

  /**
   * Handles user login by validating credentials.
   * @param req The request containing username and password in the body.
   * @param res The response, either returning the user or an error.
   * @returns A promise resolving to void.
   */
  const userLogin = async (req: UserRequest, res: Response): Promise<void> => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }
    try {
      const result = await loginUser({ username, password });
      if ('error' in result) {
        res.status(401).json({ error: result.error });
      } else {
        res.status(200).json(result);
      }
    } catch (error) {
      res.status(500).json({ error: 'Server error.' });
    }
  };

  /**
   * Retrieves a user by their username.
   * @param req The request containing the username as a route parameter.
   * @param res The response, either returning the user or an error.
   * @returns A promise resolving to void.
   */
  const getUser = async (req: UserByUsernameRequest, res: Response): Promise<void> => {
    const username = req.params.username;
    if (!username) {
      res.status(400).json({ error: 'Username parameter is required.' });
      return;
    }
    try {
      const user = await getUserByUsername(username);
      if ('error' in user) {
        res.status(404).json({ error: user.error });
      } else {
        res.status(200).json(user);
      }
    } catch (error) {
      res.status(500).json({ error: 'Server error.' });
    }
  };

  /**
   * Deletes a user by their username.
   * @param req The request containing the username as a route parameter.
   * @param res The response, either the successfully deleted user object or returning an error.
   * @returns A promise resolving to void.
   */
  const deleteUser = async (req: UserByUsernameRequest, res: Response): Promise<void> => {
    const { username } = req.params;

    if (!username) {
      res.status(400).json({ error: 'Username parameter is required.' });
      return;
    }

    try {
      const result = await deleteUserByUsername(username);
      if ('error' in result) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(200).json(result);
      }
    } catch (error) {
      res.status(500).json({ error: 'Server error.' });
    }
  };

  /**
   * Resets a user's password.
   * @param req The request containing the username and new password in the body.
   * @param res The response, either the successfully updated user object or returning an error.
   * @returns A promise resolving to void.
   */
  const resetPassword = async (req: UserRequest, res: Response): Promise<void> => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and new password are required.' });
      return;
    }
    try {
      const result = await updateUser(username, { password });
      if ('error' in result) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(200).json(result);
      }
    } catch (error) {
      res.status(500).json({ error: 'Server error.' });
    }
  };

  // Define routes for the user-related operations.
  router.post('/signup', createUser);
  router.post('/login', userLogin);
  router.get('/:username', getUser);
  router.delete('/:username', deleteUser);
  router.patch('/resetPassword', resetPassword);
  return router;
};

export default userController;
