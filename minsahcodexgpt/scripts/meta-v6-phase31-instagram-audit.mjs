#!/usr/bin/env node
import { runPhase31StaticAuditCli } from './meta-v6-phase31-audit-runner.mjs';

process.exitCode = runPhase31StaticAuditCli('instagram');
