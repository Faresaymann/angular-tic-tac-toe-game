import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { environment } from "./environments/environment";

const app = initializeApp(environment.firebase);

const db = getFirestore(app);

const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;

export { app, db, analytics };