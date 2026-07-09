.class Lcom/rnziparchive/RNZipArchiveModule$2;
.super Ljava/lang/Object;
.source "RNZipArchiveModule.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rnziparchive/RNZipArchiveModule;->unzip(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Lcom/facebook/react/bridge/Promise;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/rnziparchive/RNZipArchiveModule;

.field final synthetic val$charset:Ljava/lang/String;

.field final synthetic val$destDirectory:Ljava/lang/String;

.field final synthetic val$promise:Lcom/facebook/react/bridge/Promise;

.field final synthetic val$zipFilePath:Ljava/lang/String;


# direct methods
.method constructor <init>(Lcom/rnziparchive/RNZipArchiveModule;Ljava/lang/String;Lcom/facebook/react/bridge/Promise;Ljava/lang/String;Ljava/lang/String;)V
    .locals 0

    .line 115
    iput-object p1, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->this$0:Lcom/rnziparchive/RNZipArchiveModule;

    iput-object p2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$zipFilePath:Ljava/lang/String;

    iput-object p3, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$promise:Lcom/facebook/react/bridge/Promise;

    iput-object p4, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$charset:Ljava/lang/String;

    iput-object p5, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$destDirectory:Ljava/lang/String;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 9

    const/4 v0, 0x0

    .line 120
    :try_start_0
    new-instance v1, Ljava/io/File;

    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$zipFilePath:Ljava/lang/String;

    invoke-direct {v1, v2}, Ljava/io/File;-><init>(Ljava/lang/String;)V
    :try_end_0
    .catch Ljava/lang/NullPointerException; {:try_start_0 .. :try_end_0} :catch_1

    .line 129
    :try_start_1
    iget-object v1, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->this$0:Lcom/rnziparchive/RNZipArchiveModule;

    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$zipFilePath:Ljava/lang/String;

    iget-object v3, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$charset:Ljava/lang/String;

    invoke-static {v1, v2, v3}, Lcom/rnziparchive/RNZipArchiveModule;->access$100(Lcom/rnziparchive/RNZipArchiveModule;Ljava/lang/String;Ljava/lang/String;)J

    .line 131
    new-instance v1, Ljava/io/File;

    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$destDirectory:Ljava/lang/String;

    invoke-direct {v1, v2}, Ljava/io/File;-><init>(Ljava/lang/String;)V

    .line 132
    invoke-virtual {v1}, Ljava/io/File;->exists()Z

    move-result v2

    if-nez v2, :cond_0

    .line 134
    invoke-virtual {v1}, Ljava/io/File;->mkdirs()Z

    .line 137
    :cond_0
    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->this$0:Lcom/rnziparchive/RNZipArchiveModule;

    const-wide/16 v3, 0x0

    const-wide/16 v5, 0x1

    iget-object v7, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$zipFilePath:Ljava/lang/String;

    invoke-virtual/range {v2 .. v7}, Lcom/rnziparchive/RNZipArchiveModule;->updateProgress(JJLjava/lang/String;)V

    const/4 v1, 0x1

    new-array v2, v1, [J

    const-wide/16 v3, 0x0

    const/4 v5, 0x0

    aput-wide v3, v2, v5

    new-array v1, v1, [I

    aput v5, v1, v5

    .line 145
    sget v1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v2, 0x18

    if-lt v1, v2, :cond_1

    .line 146
    new-instance v1, Lnet/lingala/zip4j/ZipFile;

    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$zipFilePath:Ljava/lang/String;

    invoke-direct {v1, v2}, Lnet/lingala/zip4j/ZipFile;-><init>(Ljava/lang/String;)V

    .line 147
    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$charset:Ljava/lang/String;

    invoke-static {v2}, Ljava/nio/charset/Charset;->forName(Ljava/lang/String;)Ljava/nio/charset/Charset;

    move-result-object v2

    invoke-virtual {v1, v2}, Lnet/lingala/zip4j/ZipFile;->setCharset(Ljava/nio/charset/Charset;)V

    goto :goto_0

    .line 149
    :cond_1
    new-instance v1, Lnet/lingala/zip4j/ZipFile;

    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$zipFilePath:Ljava/lang/String;

    invoke-direct {v1, v2}, Lnet/lingala/zip4j/ZipFile;-><init>(Ljava/lang/String;)V

    .line 152
    :goto_0
    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$destDirectory:Ljava/lang/String;

    invoke-virtual {v1, v2}, Lnet/lingala/zip4j/ZipFile;->extractAll(Ljava/lang/String;)V

    .line 154
    invoke-virtual {v1}, Lnet/lingala/zip4j/ZipFile;->close()V

    .line 155
    iget-object v3, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->this$0:Lcom/rnziparchive/RNZipArchiveModule;

    const-wide/16 v4, 0x1

    const-wide/16 v6, 0x1

    iget-object v8, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$zipFilePath:Ljava/lang/String;

    invoke-virtual/range {v3 .. v8}, Lcom/rnziparchive/RNZipArchiveModule;->updateProgress(JJLjava/lang/String;)V

    .line 156
    iget-object v1, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$promise:Lcom/facebook/react/bridge/Promise;

    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$destDirectory:Ljava/lang/String;

    invoke-interface {v1, v2}, Lcom/facebook/react/bridge/Promise;->resolve(Ljava/lang/Object;)V
    :try_end_1
    .catch Ljava/lang/Exception; {:try_start_1 .. :try_end_1} :catch_0

    goto :goto_1

    :catch_0
    move-exception v1

    .line 158
    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->this$0:Lcom/rnziparchive/RNZipArchiveModule;

    const-wide/16 v3, 0x0

    const-wide/16 v5, 0x1

    iget-object v7, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$zipFilePath:Ljava/lang/String;

    invoke-virtual/range {v2 .. v7}, Lcom/rnziparchive/RNZipArchiveModule;->updateProgress(JJLjava/lang/String;)V

    .line 159
    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$promise:Lcom/facebook/react/bridge/Promise;

    new-instance v3, Ljava/lang/StringBuilder;

    invoke-direct {v3}, Ljava/lang/StringBuilder;-><init>()V

    const-string v4, "Failed to extract file "

    invoke-virtual {v3, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/Exception;->getLocalizedMessage()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v3, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v1

    invoke-interface {v2, v0, v1}, Lcom/facebook/react/bridge/Promise;->reject(Ljava/lang/String;Ljava/lang/String;)V

    :goto_1
    return-void

    .line 122
    :catch_1
    iget-object v1, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$promise:Lcom/facebook/react/bridge/Promise;

    new-instance v2, Ljava/lang/StringBuilder;

    invoke-direct {v2}, Ljava/lang/StringBuilder;-><init>()V

    const-string v3, "Couldn\'t open file "

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget-object v3, p0, Lcom/rnziparchive/RNZipArchiveModule$2;->val$zipFilePath:Ljava/lang/String;

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v3, ". "

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v2

    invoke-interface {v1, v0, v2}, Lcom/facebook/react/bridge/Promise;->reject(Ljava/lang/String;Ljava/lang/String;)V

    return-void
.end method
