.class Lcom/rnziparchive/RNZipArchiveModule$4;
.super Ljava/lang/Object;
.source "RNZipArchiveModule.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rnziparchive/RNZipArchiveModule;->processZip(Ljava/util/ArrayList;Ljava/lang/String;Lnet/lingala/zip4j/model/ZipParameters;Lcom/facebook/react/bridge/Promise;[C)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/rnziparchive/RNZipArchiveModule;

.field final synthetic val$destFile:Ljava/lang/String;

.field final synthetic val$entries:Ljava/util/ArrayList;

.field final synthetic val$parameters:Lnet/lingala/zip4j/model/ZipParameters;

.field final synthetic val$password:[C

.field final synthetic val$promise:Lcom/facebook/react/bridge/Promise;


# direct methods
.method constructor <init>(Lcom/rnziparchive/RNZipArchiveModule;[CLjava/lang/String;Ljava/util/ArrayList;Lnet/lingala/zip4j/model/ZipParameters;Lcom/facebook/react/bridge/Promise;)V
    .locals 0

    .line 349
    iput-object p1, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->this$0:Lcom/rnziparchive/RNZipArchiveModule;

    iput-object p2, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$password:[C

    iput-object p3, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$destFile:Ljava/lang/String;

    iput-object p4, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$entries:Ljava/util/ArrayList;

    iput-object p5, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$parameters:Lnet/lingala/zip4j/model/ZipParameters;

    iput-object p6, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$promise:Lcom/facebook/react/bridge/Promise;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 14

    const/4 v0, 0x0

    .line 354
    :try_start_0
    iget-object v1, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$password:[C

    if-eqz v1, :cond_0

    .line 355
    new-instance v1, Lnet/lingala/zip4j/ZipFile;

    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$destFile:Ljava/lang/String;

    iget-object v3, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$password:[C

    invoke-direct {v1, v2, v3}, Lnet/lingala/zip4j/ZipFile;-><init>(Ljava/lang/String;[C)V

    goto :goto_0

    .line 357
    :cond_0
    new-instance v1, Lnet/lingala/zip4j/ZipFile;

    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$destFile:Ljava/lang/String;

    invoke-direct {v1, v2}, Lnet/lingala/zip4j/ZipFile;-><init>(Ljava/lang/String;)V

    .line 360
    :goto_0
    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->this$0:Lcom/rnziparchive/RNZipArchiveModule;

    const-wide/16 v3, 0x0

    const-wide/16 v5, 0x64

    iget-object v7, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$destFile:Ljava/lang/String;

    invoke-virtual/range {v2 .. v7}, Lcom/rnziparchive/RNZipArchiveModule;->updateProgress(JJLjava/lang/String;)V

    const/4 v2, 0x0

    const/4 v3, 0x0

    const/4 v4, 0x0

    const/4 v5, 0x0

    .line 365
    :goto_1
    iget-object v6, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$entries:Ljava/util/ArrayList;

    invoke-virtual {v6}, Ljava/util/ArrayList;->size()I

    move-result v6

    if-ge v3, v6, :cond_5

    .line 366
    new-instance v6, Ljava/io/File;

    iget-object v7, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$entries:Ljava/util/ArrayList;

    invoke-virtual {v7, v3}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;

    move-result-object v7

    invoke-virtual {v7}, Ljava/lang/Object;->toString()Ljava/lang/String;

    move-result-object v7

    invoke-direct {v6, v7}, Ljava/io/File;-><init>(Ljava/lang/String;)V

    .line 368
    invoke-virtual {v6}, Ljava/io/File;->exists()Z

    move-result v7

    if-eqz v7, :cond_4

    .line 369
    invoke-virtual {v6}, Ljava/io/File;->isDirectory()Z

    move-result v7

    if-eqz v7, :cond_3

    .line 371
    invoke-virtual {v6}, Ljava/io/File;->listFiles()[Ljava/io/File;

    move-result-object v6

    invoke-static {v6}, Ljava/util/Arrays;->asList([Ljava/lang/Object;)Ljava/util/List;

    move-result-object v6

    .line 373
    invoke-interface {v6}, Ljava/util/List;->size()I

    move-result v7

    add-int/2addr v4, v7

    move v7, v5

    const/4 v5, 0x0

    .line 374
    :goto_2
    invoke-interface {v6}, Ljava/util/List;->size()I

    move-result v8

    if-ge v5, v8, :cond_2

    .line 375
    invoke-interface {v6, v5}, Ljava/util/List;->get(I)Ljava/lang/Object;

    move-result-object v8

    check-cast v8, Ljava/io/File;

    invoke-virtual {v8}, Ljava/io/File;->isDirectory()Z

    move-result v8

    if-eqz v8, :cond_1

    .line 376
    invoke-interface {v6, v5}, Ljava/util/List;->get(I)Ljava/lang/Object;

    move-result-object v8

    check-cast v8, Ljava/io/File;

    iget-object v9, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$parameters:Lnet/lingala/zip4j/model/ZipParameters;

    invoke-virtual {v1, v8, v9}, Lnet/lingala/zip4j/ZipFile;->addFolder(Ljava/io/File;Lnet/lingala/zip4j/model/ZipParameters;)V

    goto :goto_3

    .line 379
    :cond_1
    invoke-interface {v6, v5}, Ljava/util/List;->get(I)Ljava/lang/Object;

    move-result-object v8

    check-cast v8, Ljava/io/File;

    iget-object v9, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$parameters:Lnet/lingala/zip4j/model/ZipParameters;

    invoke-virtual {v1, v8, v9}, Lnet/lingala/zip4j/ZipFile;->addFile(Ljava/io/File;Lnet/lingala/zip4j/model/ZipParameters;)V

    :goto_3
    add-int/lit8 v7, v7, 0x1

    .line 382
    iget-object v8, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->this$0:Lcom/rnziparchive/RNZipArchiveModule;

    int-to-long v9, v7

    int-to-long v11, v4

    iget-object v13, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$destFile:Ljava/lang/String;

    invoke-virtual/range {v8 .. v13}, Lcom/rnziparchive/RNZipArchiveModule;->updateProgress(JJLjava/lang/String;)V

    add-int/lit8 v5, v5, 0x1

    goto :goto_2

    :cond_2
    move v5, v7

    goto :goto_4

    :cond_3
    add-int/lit8 v4, v4, 0x1

    .line 387
    iget-object v7, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$parameters:Lnet/lingala/zip4j/model/ZipParameters;

    invoke-virtual {v1, v6, v7}, Lnet/lingala/zip4j/ZipFile;->addFile(Ljava/io/File;Lnet/lingala/zip4j/model/ZipParameters;)V

    add-int/lit8 v5, v5, 0x1

    .line 389
    iget-object v6, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->this$0:Lcom/rnziparchive/RNZipArchiveModule;

    int-to-long v7, v5

    int-to-long v9, v4

    iget-object v11, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$destFile:Ljava/lang/String;

    invoke-virtual/range {v6 .. v11}, Lcom/rnziparchive/RNZipArchiveModule;->updateProgress(JJLjava/lang/String;)V

    goto :goto_4

    .line 393
    :cond_4
    iget-object v6, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$promise:Lcom/facebook/react/bridge/Promise;

    const-string v7, "File or folder does not exist"

    invoke-interface {v6, v0, v7}, Lcom/facebook/react/bridge/Promise;->reject(Ljava/lang/String;Ljava/lang/String;)V

    .line 396
    :goto_4
    iget-object v6, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->this$0:Lcom/rnziparchive/RNZipArchiveModule;

    const-wide/16 v7, 0x1

    const-wide/16 v9, 0x1

    iget-object v11, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$destFile:Ljava/lang/String;

    invoke-virtual/range {v6 .. v11}, Lcom/rnziparchive/RNZipArchiveModule;->updateProgress(JJLjava/lang/String;)V

    add-int/lit8 v3, v3, 0x1

    goto/16 :goto_1

    .line 398
    :cond_5
    iget-object v1, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$promise:Lcom/facebook/react/bridge/Promise;

    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$destFile:Ljava/lang/String;

    invoke-interface {v1, v2}, Lcom/facebook/react/bridge/Promise;->resolve(Ljava/lang/Object;)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    return-void

    :catch_0
    move-exception v1

    .line 400
    iget-object v2, p0, Lcom/rnziparchive/RNZipArchiveModule$4;->val$promise:Lcom/facebook/react/bridge/Promise;

    invoke-virtual {v1}, Ljava/lang/Exception;->getMessage()Ljava/lang/String;

    move-result-object v1

    invoke-interface {v2, v0, v1}, Lcom/facebook/react/bridge/Promise;->reject(Ljava/lang/String;Ljava/lang/String;)V

    return-void
.end method
