import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  where 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebaseConfig";
import { UserProfile, MessageMetadata, BurnoutResult, Recommendation, HRReport } from "../types";

/**
 * Creates or updates a user profile.
 */
export async function saveUserProfile(user: UserProfile): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      name: user.name,
      role: user.role,
      timezone: user.timezone,
      createdAt: user.createdAt,
      teamId: user.teamId || "default-team",
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieves a user profile by UID.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid,
        email: data.email,
        name: data.name,
        role: data.role,
        timezone: data.timezone,
        createdAt: data.createdAt,
        teamId: data.teamId,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Bulk saves communication message metadata for a user.
 */
export async function saveMessageMetadataBulk(uid: string, list: MessageMetadata[]): Promise<void> {
  const parentPath = `users/${uid}/metadata`;
  try {
    for (const item of list) {
      const colRef = collection(db, "users", uid, "metadata");
      await addDoc(colRef, {
        timestamp: item.timestamp,
        hourOfDay: item.hourOfDay,
        isWeekend: item.isWeekend,
        messageLength: item.messageLength,
        responseTimeMinutes: item.responseTimeMinutes,
        source: item.source,
        createdAt: item.createdAt,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, parentPath);
  }
}

/**
 * Fetches recent message metadata entries for a user, sorted by message timestamp.
 */
export async function getRecentMessageMetadata(uid: string, limitCount = 100): Promise<MessageMetadata[]> {
  const path = `users/${uid}/metadata`;
  try {
    const colRef = collection(db, "users", uid, "metadata");
    const q = query(colRef, orderBy("timestamp", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const results: MessageMetadata[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      results.push({
        id: docSnap.id,
        timestamp: data.timestamp,
        hourOfDay: data.hourOfDay,
        isWeekend: data.isWeekend,
        messageLength: data.messageLength,
        responseTimeMinutes: data.responseTimeMinutes,
        source: data.source,
        createdAt: data.createdAt,
      });
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Saves a calculated burnout risk score.
 */
export async function saveBurnoutScore(uid: string, result: BurnoutResult): Promise<string> {
  const path = `users/${uid}/scores`;
  try {
    const colRef = collection(db, "users", uid, "scores");
    const docRef = await addDoc(colRef, {
      score: result.score,
      category: result.category,
      signalsJson: result.signalsJson,
      topFactors: result.topFactors,
      calculatedAt: result.calculatedAt,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches the user's historical scores.
 */
export async function getScoresHistory(uid: string): Promise<BurnoutResult[]> {
  const path = `users/${uid}/scores`;
  try {
    const colRef = collection(db, "users", uid, "scores");
    const q = query(colRef, orderBy("calculatedAt", "desc"), limit(50));
    const querySnapshot = await getDocs(q);

    const scores: BurnoutResult[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      scores.push({
        score: data.score,
        category: data.category,
        signalsJson: data.signalsJson || "[]",
        topFactors: data.topFactors || [],
        dataPoints: 7, // week analysis
        calculatedAt: data.calculatedAt,
      });
    });
    return scores;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Bulk saves micro-break wellness recommendations for a score.
 */
export async function saveRecommendationsBulk(
  uid: string,
  scoreId: string,
  recs: Omit<Recommendation, "id" | "completedAt">[]
): Promise<void> {
  const path = `users/${uid}/recommendations`;
  try {
    const colRef = collection(db, "users", uid, "recommendations");
    for (const rec of recs) {
      await addDoc(colRef, {
        title: rec.title,
        durationMinutes: rec.durationMinutes,
        bestTime: rec.bestTime,
        reason: rec.reason,
        completedAt: null,
        scoreId: scoreId,
        type: rec.type,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches recommendations for a user.
 */
export async function getUserRecommendations(uid: string): Promise<Recommendation[]> {
  const path = `users/${uid}/recommendations`;
  try {
    const colRef = collection(db, "users", uid, "recommendations");
    const q = query(colRef, orderBy("completedAt", "asc"));
    const querySnapshot = await getDocs(q);

    const recs: Recommendation[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      recs.push({
        id: docSnap.id,
        title: data.title,
        durationMinutes: data.durationMinutes,
        bestTime: data.bestTime,
        reason: data.reason,
        completedAt: data.completedAt,
        scoreId: data.scoreId,
        type: data.type,
      });
    });
    return recs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Marks a wellness recommendation as completed.
 */
export async function markRecommendationCompleted(uid: string, recId: string): Promise<void> {
  const path = `users/${uid}/recommendations/${recId}`;
  try {
    const docRef = doc(db, "users", uid, "recommendations", recId);
    await updateDoc(docRef, {
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Saves aggregated HR weekly burnout reports.
 */
export async function saveHRReport(report: HRReport): Promise<void> {
  const path = "hrReports";
  try {
    const colRef = collection(db, "hrReports");
    await addDoc(colRef, {
      calculatedAt: report.calculatedAt,
      averageScore: report.averageScore,
      totalUsers: report.totalUsers,
      categoryDistribution: report.categoryDistribution,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieves the latest HR report.
 */
export async function getLatestHRReport(): Promise<HRReport | null> {
  const path = "hrReports";
  try {
    const colRef = collection(db, "hrReports");
    const q = query(colRef, orderBy("calculatedAt", "desc"), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      return {
        id: docSnap.id,
        calculatedAt: data.calculatedAt,
        averageScore: data.averageScore,
        totalUsers: data.totalUsers,
        categoryDistribution: data.categoryDistribution,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Retreives an array of all HR weekly reports.
 */
export async function getHRReportsHistory(): Promise<HRReport[]> {
  const path = "hrReports";
  try {
    const colRef = collection(db, "hrReports");
    const q = query(colRef, orderBy("calculatedAt", "desc"));
    const querySnapshot = await getDocs(q);

    const reports: HRReport[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      reports.push({
        id: docSnap.id,
        calculatedAt: data.calculatedAt,
        averageScore: data.averageScore,
        totalUsers: data.totalUsers,
        categoryDistribution: data.categoryDistribution,
      });
    });
    return reports;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
