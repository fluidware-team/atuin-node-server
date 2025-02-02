/*
 * Copyright Fluidware srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createTransport, Transporter } from 'nodemailer';
import { Settings } from '../Settings';
import { getLogger } from '@fluidware-it/saddlebag';
import { PUBLIC_URL } from '../consts';
import { compileFile, compileTemplate } from 'pug';
import type { User } from '../types';

let transporter: Transporter;
let callback: (err: Error | null, info: MessageInfo) => void;

const logger = getLogger().child({ component: 'mailerHelper' });

const templates: { [key: string]: compileTemplate } = {};

export interface MessageInfo {
  messageId: string;
  message: string;
  envelope: {
    from: string;
    to: string[];
  };
}

export function setMailerTransporter(t: Transporter, _callback: (err: Error | null, info: MessageInfo) => void) {
  transporter = t;
  callback = _callback;
}

export function sendMail(to: string, subject: string, text: string, html?: string) {
  if (!transporter) {
    transporter = createTransport(Settings.smtpSettings);
  }
  transporter.sendMail(
    {
      to,
      subject,
      text,
      html,
      from: Settings.emailFrom
    },
    (err, info) => {
      if (err) {
        logger.error({ reason: err.message }, `Error sending email to ${to}`);
      } else {
        logger.info('Email sent', { to, subject, messageId: info.messageId });
      }
      if (callback) {
        callback(err, info);
      }
    }
  );
}

export function sendValidationEmail(to: string, username: string, validationCode: string) {
  const subject = '[natuin][Action required] Validate your email';
  if (!templates['registrationValidation']) {
    templates['registrationValidation'] = compileFile('templates/email.validate.txt.pug');
  }
  const text = templates['registrationValidation']({
    username,
    validationCode,
    PUBLIC_URL,
    expireDate: new Date(Date.now() + Settings.emailRegistrationValidationTimeout).toISOString()
  });
  sendMail(to, subject, text);
}

export function sendResetPasswordEmail(to: string, username: string, resetCode: string) {
  const subject = '[natuin] Instructions for changing your password';
  if (!templates['resetPassword']) {
    templates['resetPassword'] = compileFile('templates/password.reset.txt.pug');
  }
  const text = templates['resetPassword']({
    username,
    resetCode,
    PUBLIC_URL
  });
  sendMail(to, subject, text);
}

export function sendInvitationEmail(to: string, inviter: User, invitationCode: string) {
  const subject = '[natuin] You have been invited to join';
  if (!templates['invitation']) {
    templates['invitation'] = compileFile('templates/invitation.txt.pug');
  }
  const text = templates['invitation']({
    inviter,
    invitationCode,
    PUBLIC_URL
  });
  sendMail(to, subject, text);
}
