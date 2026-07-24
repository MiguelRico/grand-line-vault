import { hash } from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Uso: npm run hash-password -- "tu contraseña segura"');
  process.exit(1);
}
console.log(await hash(password, 12));
