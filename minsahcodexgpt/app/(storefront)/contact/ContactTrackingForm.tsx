'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { getSiteConfig } from '@/lib/site-config';
import { trackContactEvent } from '@/lib/tracking/events';

const { business, identity } = getSiteConfig();

function buildMailtoUrl(name: string, email: string, message: string) {
  const subject = encodeURIComponent(`${identity.name} contact request${name ? ` from ${name}` : ''}`);
  const body = encodeURIComponent(
    [
      name ? `Name: ${name}` : undefined,
      email ? `Email: ${email}` : undefined,
      '',
      message || `Hello ${identity.name} team,`,
    ]
      .filter((line) => line !== undefined)
      .join('\n'),
  );

  return `mailto:${business.supportEmail}?subject=${subject}&body=${body}`;
}

export default function ContactTrackingForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    trackContactEvent({
      method: 'form_mailto',
      label: 'Contact form',
    });

    window.location.href = buildMailtoUrl(name.trim(), email.trim(), message.trim());
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input
        id="contact-name"
        name="name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Your name"
        label="Name"
        labelClassName="text-sm font-bold text-minsah-text"
      />
      <Input
        id="contact-email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="your@email.com"
        label="Email"
        labelClassName="text-sm font-bold text-minsah-text"
      />
      <Textarea
        id="contact-message"
        name="message"
        rows={6}
        required
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="How can we help?"
        label="Message"
        labelClassName="text-sm font-bold text-minsah-text"
        className="min-h-36 resize-y"
      />
      <p className="text-xs leading-5 text-minsah-muted">
        Submitting opens your email application and sends the message to {business.supportEmail}.
      </p>
      <Button
        type="submit"
        variant="primary"
        fullWidth
        className="rounded-xl bg-minsah-primary px-6 py-3 font-bold hover:bg-minsah-dark"
      >
        <Send size={18} aria-hidden="true" /> Send message
      </Button>
    </form>
  );
}
