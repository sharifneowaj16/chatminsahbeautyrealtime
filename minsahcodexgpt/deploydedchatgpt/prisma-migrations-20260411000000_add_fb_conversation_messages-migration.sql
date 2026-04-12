-- CreateEnum
CREATE TYPE "FbSenderType" AS ENUM ('CUSTOMER', 'PAGE');

-- CreateTable
CREATE TABLE "FbConversation" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "customerPsid" TEXT NOT NULL,
    "customerName" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "isReplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FbConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FbMessage" (
    "id" TEXT NOT NULL,
    "fbMessageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "FbSenderType" NOT NULL,
    "text" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FbMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FbConversation_threadId_key" ON "FbConversation"("threadId");

-- CreateIndex
CREATE INDEX "FbConversation_pageId_idx" ON "FbConversation"("pageId");

-- CreateIndex
CREATE INDEX "FbConversation_lastMessageAt_idx" ON "FbConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "FbConversation_isReplied_idx" ON "FbConversation"("isReplied");

-- CreateIndex
CREATE UNIQUE INDEX "FbMessage_fbMessageId_key" ON "FbMessage"("fbMessageId");

-- CreateIndex
CREATE INDEX "FbMessage_conversationId_idx" ON "FbMessage"("conversationId");

-- CreateIndex
CREATE INDEX "FbMessage_timestamp_idx" ON "FbMessage"("timestamp");

-- AddForeignKey
ALTER TABLE "FbMessage" ADD CONSTRAINT "FbMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "FbConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
