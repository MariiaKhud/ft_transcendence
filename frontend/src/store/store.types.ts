import type { StateCreator } from 'zustand'
import type { AuthSlice } from '@/store/slices/authSlice'

export interface StoreState extends AuthSlice {}

export type StoreSlice<TSlice> = StateCreator<StoreState, [], [], TSlice>
