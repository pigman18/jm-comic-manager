.class Lcom/rnfs/RNFSManager$CopyFileTask;
.super Landroid/os/AsyncTask;
.source "RNFSManager.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/rnfs/RNFSManager;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x2
    name = "CopyFileTask"
.end annotation

.annotation system Ldalvik/annotation/Signature;
    value = {
        "Landroid/os/AsyncTask<",
        "Ljava/lang/String;",
        "Ljava/lang/Void;",
        "Ljava/lang/Exception;",
        ">;"
    }
.end annotation


# instance fields
.field final synthetic this$0:Lcom/rnfs/RNFSManager;


# direct methods
.method private constructor <init>(Lcom/rnfs/RNFSManager;)V
    .locals 0

    .line 402
    iput-object p1, p0, Lcom/rnfs/RNFSManager$CopyFileTask;->this$0:Lcom/rnfs/RNFSManager;

    invoke-direct {p0}, Landroid/os/AsyncTask;-><init>()V

    return-void
.end method

.method synthetic constructor <init>(Lcom/rnfs/RNFSManager;Lcom/rnfs/RNFSManager$1;)V
    .locals 0

    .line 402
    invoke-direct {p0, p1}, Lcom/rnfs/RNFSManager$CopyFileTask;-><init>(Lcom/rnfs/RNFSManager;)V

    return-void
.end method


# virtual methods
.method protected varargs doInBackground([Ljava/lang/String;)Ljava/lang/Exception;
    .locals 4

    const/4 v0, 0x0

    .line 405
    :try_start_0
    aget-object v1, p1, v0

    const/4 v2, 0x1

    .line 406
    aget-object p1, p1, v2

    .line 408
    iget-object v2, p0, Lcom/rnfs/RNFSManager$CopyFileTask;->this$0:Lcom/rnfs/RNFSManager;

    invoke-static {v2, v1}, Lcom/rnfs/RNFSManager;->access$200(Lcom/rnfs/RNFSManager;Ljava/lang/String;)Ljava/io/InputStream;

    move-result-object v1

    .line 409
    iget-object v2, p0, Lcom/rnfs/RNFSManager$CopyFileTask;->this$0:Lcom/rnfs/RNFSManager;

    invoke-static {v2, p1, v0}, Lcom/rnfs/RNFSManager;->access$300(Lcom/rnfs/RNFSManager;Ljava/lang/String;Z)Ljava/io/OutputStream;

    move-result-object p1

    const/16 v2, 0x400

    new-array v2, v2, [B

    .line 413
    :goto_0
    invoke-virtual {v1, v2}, Ljava/io/InputStream;->read([B)I

    move-result v3

    if-lez v3, :cond_0

    .line 414
    invoke-virtual {p1, v2, v0, v3}, Ljava/io/OutputStream;->write([BII)V

    .line 415
    invoke-static {}, Ljava/lang/Thread;->yield()V

    goto :goto_0

    .line 417
    :cond_0
    invoke-virtual {v1}, Ljava/io/InputStream;->close()V

    .line 418
    invoke-virtual {p1}, Ljava/io/OutputStream;->close()V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    const/4 p1, 0x0

    return-object p1

    :catch_0
    move-exception p1

    return-object p1
.end method

.method protected bridge synthetic doInBackground([Ljava/lang/Object;)Ljava/lang/Object;
    .locals 0

    .line 402
    check-cast p1, [Ljava/lang/String;

    invoke-virtual {p0, p1}, Lcom/rnfs/RNFSManager$CopyFileTask;->doInBackground([Ljava/lang/String;)Ljava/lang/Exception;

    move-result-object p1

    return-object p1
.end method
