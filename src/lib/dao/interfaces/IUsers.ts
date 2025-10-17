import { User, UserInsert, UserUpdate } from "@/model/interfaces/User";

export interface IUsers {
  createUser(userData: UserInsert): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByAuthId(authId: string): Promise<User | null>;
  updateUser(id: string, userData: UserUpdate): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
}
