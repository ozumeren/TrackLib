-- CreateTable
CREATE TABLE "public"."Segment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB NOT NULL,
    "customerId" INTEGER NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_PlayerSegments" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PlayerSegments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PlayerSegments_B_index" ON "public"."_PlayerSegments"("B");

-- AddForeignKey
ALTER TABLE "public"."Segment" ADD CONSTRAINT "Segment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PlayerSegments" ADD CONSTRAINT "_PlayerSegments_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PlayerSegments" ADD CONSTRAINT "_PlayerSegments_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
