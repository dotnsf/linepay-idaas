/* linepay-idaas.ddl */

/* users */
drop table users;
create table if not exists users ( id varchar(50) not null primary key, type int default 0, created bigint default 0, updated bigint default 0 );

/* transactions */
drop table transactions;
create table if not exists transactions ( id varchar(50) not null primary key, user_id varchar(50) not null, order_id varchar(50) not null, amount int default 0, currency varchar(10) default '', created bigint default 0, updated bigint default 0 );
