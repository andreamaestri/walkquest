-- WalkQuest on Oracle (Autonomous Database or Oracle Database Free).
-- Run once as ADMIN (Autonomous) or SYSTEM (Free/self-managed).
-- Replace WALKQUEST / the password with your own values.

CREATE USER walkquest IDENTIFIED BY "change-me-Strong#Passw0rd";

-- Needed by Django migrations (tables, sequences/identity columns, triggers).
GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE PROCEDURE,
      CREATE TRIGGER, CREATE VIEW, CREATE TYPE TO walkquest;
GRANT EXECUTE ON SYS.DBMS_LOB TO walkquest;
GRANT EXECUTE ON SYS.DBMS_RANDOM TO walkquest;
ALTER USER walkquest QUOTA UNLIMITED ON DATA;   -- Autonomous: DATA; Free: USERS

-- Only for running the test suite against this database (not needed in
-- production): Django creates and drops a separate test user/tablespace.
-- GRANT CREATE USER, ALTER USER, DROP USER, CREATE TABLESPACE, DROP TABLESPACE
--   TO walkquest WITH ADMIN OPTION;
-- GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE PROCEDURE,
--   CREATE TRIGGER, CREATE VIEW, CREATE TYPE, UNLIMITED TABLESPACE
--   TO walkquest WITH ADMIN OPTION;
