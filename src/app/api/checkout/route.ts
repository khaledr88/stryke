import { CACHE_TAGS } from "@shared/constants";
import { AppError } from "@core/lib/errors";
import { placeOrderCore } from "@core/orders/placeOrder";
import { clientIp, readJson, refresh, respond } from "@/lib/server/api";
import { adminDb } from "@/lib/server/firebase";
import { verifyAppCheckToken } from "@/lib/server/tokens";

/**
 * Guest Cash-on-Delivery checkout. Prices, delivery fee and stock are worked
 * out on the server inside a Firestore transaction — nothing the browser sends
 * about money or stock is trusted.
 */
export async function POST(request: Request) {
  return respond(async () => {
    if (process.env.ENFORCE_APP_CHECK === "true") {
      const token = request.headers.get("x-firebase-appcheck");
      if (!token) throw new AppError("unauthenticated", "Please refresh the page and try again.");
      try {
        await verifyAppCheckToken(token);
      } catch {
        throw new AppError("unauthenticated", "Please refresh the page and try again.");
      }
    }
    const body = await readJson(request);
    const { receipt, slugs } = await placeOrderCore(adminDb(), body, { ip: clientIp(request) });
    if (slugs.length) refresh([CACHE_TAGS.products, ...slugs.map(CACHE_TAGS.product)]);
    return receipt;
  });
}
