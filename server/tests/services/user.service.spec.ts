import UserModel from '../../models/users.model';
import {
  deleteUserByUsername,
  getUserByUsername,
  loginUser,
  saveUser,
  updateUser,
} from '../../services/user.service';
import { SafeUser, User, UserCredentials } from '../../types/user';
import { user, safeUser } from '../mockData.models';

 
const mockingoose = require('mockingoose');

describe('User model', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  describe('saveUser', () => {
    beforeEach(() => {
      mockingoose.resetAll();
    });

    it('should return the saved user', async () => {
      mockingoose(UserModel).toReturn(user, 'create');

      const savedUser = (await saveUser(user)) as SafeUser;

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toEqual(user.username);
      expect(savedUser.dateJoined).toEqual(user.dateJoined);
    });

    it('should save and return the user object (without password) on success', async () => {
      mockingoose(UserModel).toReturn(user, 'create');

      const savedUser = await saveUser(user);

      expect(savedUser).toHaveProperty('username', user.username);
      expect(savedUser).toHaveProperty('dateJoined', user.dateJoined);
      expect(savedUser).not.toHaveProperty('password');
    });

    it('should not include password in the returned user object', async () => {
      mockingoose(UserModel).toReturn(user, 'create');

      const savedUser = await saveUser(user);

      expect(savedUser).not.toHaveProperty('password');
    });

    it('should handle saving user when _id is not provided (let DB generate it)', async () => {
      const userWithoutId = { ...user, _id: undefined };
      mockingoose(UserModel).toReturn(user, 'create');

      const savedUser = await saveUser(userWithoutId as any);

      expect(savedUser).toHaveProperty('username', user.username);
      expect(savedUser).toHaveProperty('dateJoined', user.dateJoined);
    });

    it('should return an error if error when saving to database', async () => {
      jest.spyOn(UserModel, 'create').mockRejectedValueOnce(new Error('Database error'));

      const saveError = await saveUser(user);

      expect('error' in saveError).toBe(true);
      if ('error' in saveError) {
        expect(saveError.error).toContain('Error when saving user');
      }
    });

    it('should handle duplicate username error', async () => {
      jest
        .spyOn(UserModel, 'create')
        .mockRejectedValueOnce(new Error('E11000 duplicate key error'));

      const result = await saveUser(user);

      expect(result).toHaveProperty('error');
      expect((result as any).error).toContain('E11000 duplicate key error');
    });
  });
});

describe('getUserByUsername', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the matching user', async () => {
    mockingoose(UserModel).toReturn(safeUser, 'findOne');

    const retrievedUser = (await getUserByUsername(user.username)) as SafeUser;

    expect(retrievedUser.username).toEqual(user.username);
    expect(retrievedUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should return error if user does not exist', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');

    const result = await getUserByUsername('randomUser');
    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('User not found');
  });

  it('should handle database errors', async () => {
    mockingoose(UserModel).toReturn(new Error('DB error'), 'findOne');

    const result = await getUserByUsername(user.username);
    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('DB error');
  });

  it('should throw an error if there is an error while searching the database', async () => {
    mockingoose(UserModel).toReturn(new Error('Error finding document'), 'findOne');

    const getUserError = await getUserByUsername(user.username);

    expect('error' in getUserError).toBe(true);
    if ('error' in getUserError) {
      expect(getUserError.error).toContain('Error when finding user');
    }
  });
});

describe('loginUser', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the user if authentication succeeds', async () => {
    mockingoose(UserModel).toReturn(user, 'findOne');

    const credentials: UserCredentials = {
      username: user.username,
      password: user.password,
    };

    const loggedInUser = (await loginUser(credentials)) as SafeUser;

    expect(loggedInUser.username).toEqual(user.username);
    expect(loggedInUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should return error if username does not exist', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');
    const credentials: UserCredentials = { username: 'invalid', password: 'random' };
    const result = await loginUser(credentials);
    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('User not found.');
  });

  it('should return error if password does not match', async () => {
    mockingoose(UserModel).toReturn({ ...user, password: 'realPassword' }, 'findOne');
    const credentials: UserCredentials = { username: user.username, password: 'wrongPassword' };
    const result = await loginUser(credentials);
    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('Invalid username or password');
  });

  it('should handle DB errors', async () => {
    mockingoose(UserModel).toReturn(new Error('DB error'), 'findOne');
    const credentials: UserCredentials = { username: user.username, password: user.password };
    const result = await loginUser(credentials);
    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('DB error');
  });

  it('should handle empty username login attempt', async () => {
    const credentials: UserCredentials = { username: '', password: user.password };
    mockingoose(UserModel).toReturn(null, 'findOne');

    const result = await loginUser(credentials);

    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('User not found.');
  });

  it('should handle empty password login attempt', async () => {
    const credentials: UserCredentials = { username: user.username, password: '' };
    mockingoose(UserModel).toReturn({ ...user, password: 'realPassword' }, 'findOne');

    const result = await loginUser(credentials);

    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('Invalid username or password');
  });
});

describe('deleteUserByUsername', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the deleted user when deleted succesfully', async () => {
    mockingoose(UserModel).toReturn(safeUser, 'findOneAndDelete');

    const deletedUser = (await deleteUserByUsername(user.username)) as SafeUser;

    expect(deletedUser.username).toEqual(user.username);
    expect(deletedUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should return error if user does not exist', async () => {
    mockingoose(UserModel).toReturn(null, 'findOneAndDelete');
    const result = await deleteUserByUsername('random');
    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('User not found');
  });

  it('should handle DB errors', async () => {
    mockingoose(UserModel).toReturn(new Error('DB error'), 'findOneAndDelete');
    const result = await deleteUserByUsername(user.username);
    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('DB error');
  });

  it('should throw an error if a database error while deleting', async () => {
    mockingoose(UserModel).toReturn(new Error('Error deleting object'), 'findOneAndDelete');

    const deletedError = await deleteUserByUsername(user.username);

    expect('error' in deletedError).toBe(true);
    if ('error' in deletedError) {
      expect(deletedError.error).toContain('Error deleting user');
    }
  });
});

describe('updateUser', () => {
  const updatedUser: User = {
    ...user,
    password: 'newPassword',
  };

  const safeUpdatedUser: SafeUser = {
    username: user.username,
    dateJoined: user.dateJoined,
  };

  const updates: Partial<User> = {
    password: 'newPassword',
  };

  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the updated user when updated succesfully', async () => {
    mockingoose(UserModel).toReturn(safeUpdatedUser, 'findOneAndUpdate');

    const result = (await updateUser(user.username, updates)) as SafeUser;

    expect(result.username).toEqual(user.username);
    expect(result.username).toEqual(updatedUser.username);
    expect(result.dateJoined).toEqual(user.dateJoined);
    expect(result.dateJoined).toEqual(updatedUser.dateJoined);
  });

  it('should update and return the user when resetting password', async () => {
    const updatedUserWithNewPassword = { ...user, password: 'newPassword' };
    mockingoose(UserModel).toReturn(updatedUserWithNewPassword, 'findOneAndUpdate');

    const result = await updateUser(user.username, { password: 'newPassword' });

    expect(result).toHaveProperty('username', user.username);
    expect(result).not.toHaveProperty('password');
  });

  it('should return error if user does not exist', async () => {
    mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');

    const result = await updateUser('nonexistent', { password: 'anything' });
    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('User not found');
  });

  it('should handle database errors during password reset', async () => {
    mockingoose(UserModel).toReturn(new Error('DB error'), 'findOneAndUpdate');

    const result = await updateUser(user.username, { password: 'fail' });
    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('DB error');
  });

  it('should throw an error if a database error while updating', async () => {
    mockingoose(UserModel).toReturn(new Error('Error updating object'), 'findOneAndUpdate');

    const updatedError = await updateUser(user.username, { password: 'newPassword' });

    expect('error' in updatedError).toBe(true);
    if ('error' in updatedError) {
      expect(updatedError.error).toContain('Error updating user');
    }
  });

  it('should handle empty update object', async () => {
    mockingoose(UserModel).toReturn(safeUpdatedUser, 'findOneAndUpdate');

    const result = await updateUser(user.username, {});

    expect(result).toHaveProperty('username', user.username);
    expect(result).not.toHaveProperty('password');
  });
});
