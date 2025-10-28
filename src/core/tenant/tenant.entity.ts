import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'db_host' })
  dbHost: string;

  @Column({ name: 'db_port' })
  dbPort: number;

  @Column({ name: 'db_name' })
  dbName: string;

  @Column({ name: 'db_user' })
  dbUser: string;

  @Column({ name: 'db_password' })
  dbPassword: string;

  @Column('jsonb', { nullable: true, name: 'pool_options' })
  poolOptions?: {
    max?: number;
    min?: number;
    acquireTimeout?: number;
    timeout?: number;
    idleTimeoutMillis?: number;
  };

  @Column({ default: true, name: 'active' })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
