import axios from 'axios';
import { config } from '../core/config';

export const orderbookClient = axios.create({
  baseURL: config.orderbook.baseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});
