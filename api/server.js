import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.MOBILE_API_PORT || 4100);

const server = app.listen(port, () => {
  console.log(`SECSS Mobile API en puerto ${port}`);
});

export default server;
