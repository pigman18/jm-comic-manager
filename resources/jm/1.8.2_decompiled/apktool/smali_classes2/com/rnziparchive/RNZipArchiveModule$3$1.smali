.class Lcom/rnziparchive/RNZipArchiveModule$3$1;
.super Ljava/lang/Object;
.source "RNZipArchiveModule.java"

# interfaces
.implements Lcom/rnziparchive/StreamUtil$ProgressCallback;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rnziparchive/RNZipArchiveModule$3;->run()V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$1:Lcom/rnziparchive/RNZipArchiveModule$3;

.field final synthetic val$extractedBytes:[J

.field final synthetic val$finalEntry:Ljava/util/zip/ZipEntry;

.field final synthetic val$lastPercentage:[I

.field final synthetic val$size:J


# direct methods
.method constructor <init>(Lcom/rnziparchive/RNZipArchiveModule$3;[J[IJLjava/util/zip/ZipEntry;)V
    .locals 0

    .line 225
    iput-object p1, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->this$1:Lcom/rnziparchive/RNZipArchiveModule$3;

    iput-object p2, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->val$extractedBytes:[J

    iput-object p3, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->val$lastPercentage:[I

    iput-wide p4, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->val$size:J

    iput-object p6, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->val$finalEntry:Ljava/util/zip/ZipEntry;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public onCopyProgress(J)V
    .locals 8

    .line 228
    iget-object v0, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->val$extractedBytes:[J

    const/4 v1, 0x0

    aget-wide v2, v0, v1

    add-long/2addr v2, p1

    aput-wide v2, v0, v1

    .line 230
    iget-object p1, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->val$lastPercentage:[I

    aget p2, p1, v1

    .line 231
    aget-wide v2, v0, v1

    long-to-double v2, v2

    const-wide/high16 v4, 0x4059000000000000L    # 100.0

    mul-double v2, v2, v4

    iget-wide v4, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->val$size:J

    long-to-double v4, v4

    div-double/2addr v2, v4

    double-to-int v0, v2

    if-le v0, p2, :cond_0

    .line 235
    aput v0, p1, v1

    .line 236
    iget-object p1, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->this$1:Lcom/rnziparchive/RNZipArchiveModule$3;

    iget-object v2, p1, Lcom/rnziparchive/RNZipArchiveModule$3;->this$0:Lcom/rnziparchive/RNZipArchiveModule;

    iget-object p1, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->val$extractedBytes:[J

    aget-wide v3, p1, v1

    iget-wide v5, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->val$size:J

    iget-object p1, p0, Lcom/rnziparchive/RNZipArchiveModule$3$1;->val$finalEntry:Ljava/util/zip/ZipEntry;

    invoke-virtual {p1}, Ljava/util/zip/ZipEntry;->getName()Ljava/lang/String;

    move-result-object v7

    invoke-virtual/range {v2 .. v7}, Lcom/rnziparchive/RNZipArchiveModule;->updateProgress(JJLjava/lang/String;)V

    :cond_0
    return-void
.end method
