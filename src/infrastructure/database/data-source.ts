import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../../config/data-source-options';

dotenv.config();

/**
 * Standalone DataSource used by the seed script (outside the Nest DI context).
 */
export const AppDataSource = new DataSource(buildDataSourceOptions());
