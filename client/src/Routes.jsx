import { useContext } from "react";
import { UserContext } from "./UserContext";
import RegisterAndLoginForm from "./RegisterAndLoginForm";
import Chat from "./Chat";

export default function Routes() {
  const { username } = useContext(UserContext);
  if (username) return <Chat />;
  return <RegisterAndLoginForm />;
}
