import { redirect } from 'next/navigation';

export default function NewAddressPage() {
  redirect('/account/addresses');
}
