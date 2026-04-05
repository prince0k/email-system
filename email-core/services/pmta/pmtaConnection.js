import { NodeSSH } from "node-ssh";
import fs from "fs";

export async function connectPmta(server){

 const ssh = new NodeSSH();

 await ssh.connect({
   host: server.pmta.host,
   username: server.pmta.sshUser,
   privateKey: fs.readFileSync("/root/.ssh/id_rsa","utf8"),
   port: server.pmta.sshPort || 22
 });

 return ssh;

}