import type { APIRoute } from "astro"
import { splitKeys } from "~/utils"
import { localKey, genBillingsTable, baseURL, fetchBilling } from "."
const sendKey = import.meta.env.SENDKEY
const sendChannel = import.meta.env.SENDCHANNEL || "9"

export { config } from "./config"

export const get: APIRoute = async () => {
  try {
    const keys = Array.from(new Set(splitKeys(localKey)))
    if (keys.length === 0) return new Response("")
    if (!sendKey) return new Response("")
    const billings = await Promise.all(keys.map(k => fetchBilling(k)))
    const bannedKeyBillings = billings.filter(k => k.totalGranted === 0)
    const unBanKeyBillings = billings.filter(k => k.totalGranted > 0)
    const table = await genBillingsTable(billings)
    const titles = ["帐号余额充足", "没有帐号不可用"]
    if (unBanKeyBillings.some(k => k.rate < 0.05))
      titles[0] = "有帐号余额已少于 5%"
    if (bannedKeyBillings.length) {
      titles[1] = "有帐号不可用"
    }
    await push(titles.join("，"), table)
  } catch (e) {
    await push(`运行错误\n${String(e)}`)
  }
  return new Response(`ok`)
}

async function push(title: string, desp?: string) {
  if (sendKey)
    await fetch(`https://sctapi.ftqq.com/${sendKey}.send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        desp,
        channel: Number.isInteger(sendChannel) ? Number(sendChannel) : 9
      })
    })
}
