BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Categories] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(255),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [DF__Categorie__creat__38996AB5] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Categori__3213E83F65872C74] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ__Categori__72E12F1BB56C122C] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Users] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(100) NOT NULL,
    [email] NVARCHAR(150) NOT NULL,
    [phone] NVARCHAR(15) NOT NULL,
    [college_id] NVARCHAR(20) NOT NULL,
    [password_hash] NVARCHAR(255) NOT NULL,
    [role] NVARCHAR(10) NOT NULL CONSTRAINT [DF__Users__role__3D5E1FD2] DEFAULT 'STUDENT',
    [must_change_password] BIT NOT NULL CONSTRAINT [DF__Users__must_chan__3F466844] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [DF__Users__created_a__403A8C7D] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Users__3213E83F7D3C1543] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ__Users__AB6E6164BC66BB1E] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [UQ__Users__012CD28D5351A9DD] UNIQUE NONCLUSTERED ([college_id])
);

-- CreateTable
CREATE TABLE [dbo].[MenuItems] (
    [id] INT NOT NULL IDENTITY(1,1),
    [category_id] INT NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [price] DECIMAL(10,2) NOT NULL,
    [stock_qty] INT NOT NULL CONSTRAINT [DF__MenuItems__stock__4316F928] DEFAULT 0,
    [is_available] BIT NOT NULL CONSTRAINT [DF__MenuItems__is_av__440B1D61] DEFAULT 1,
    [item_type] NVARCHAR(10) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [DF__MenuItems__creat__45F365D3] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__MenuItem__3213E83FA47BC612] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CanteenSettings] (
    [id] INT NOT NULL IDENTITY(1,1),
    [open_time] NVARCHAR(5) NOT NULL,
    [close_time] NVARCHAR(5) NOT NULL,
    [slot_interval_minutes] INT NOT NULL CONSTRAINT [CanteenSettings_slot_interval_minutes_df] DEFAULT 15,
    [blocked_slots] NVARCHAR(500),
    [is_open] BIT NOT NULL CONSTRAINT [CanteenSettings_is_open_df] DEFAULT 1,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [CanteenSettings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Orders] (
    [id] INT NOT NULL IDENTITY(1,1),
    [user_id] INT NOT NULL,
    [pickup_time] NVARCHAR(5) NOT NULL,
    [order_type] NVARCHAR(10) NOT NULL,
    [status] NVARCHAR(15) NOT NULL CONSTRAINT [DF__Orders__status__4E88ABD4] DEFAULT 'PENDING',
    [token_number] INT NOT NULL,
    [total_amount] DECIMAL(10,2) NOT NULL,
    [placed_at] DATETIME2 NOT NULL CONSTRAINT [DF__Orders__placed_a__5070F446] DEFAULT CURRENT_TIMESTAMP,
    [group_leader_id] INT,
    CONSTRAINT [PK__Orders__3213E83F9D8DA35E] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OrderItems] (
    [id] INT NOT NULL IDENTITY(1,1),
    [order_id] INT NOT NULL,
    [menu_item_id] INT NOT NULL,
    [quantity] INT NOT NULL CONSTRAINT [DF__OrderItem__quant__5629CD9C] DEFAULT 1,
    [unit_price] DECIMAL(10,2) NOT NULL,
    CONSTRAINT [PK__OrderIte__3213E83F4867F413] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[GroupMembers] (
    [id] INT NOT NULL IDENTITY(1,1),
    [order_id] INT NOT NULL,
    [member_user_id] INT NOT NULL,
    [joined_at] DATETIME2 NOT NULL CONSTRAINT [DF__GroupMemb__joine__5AEE82B9] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__GroupMem__3213E83F567C713B] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Payments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [order_id] INT NOT NULL,
    [method] NVARCHAR(10) NOT NULL,
    [amount] DECIMAL(10,2) NOT NULL,
    [txn_id] NVARCHAR(100),
    [status] NVARCHAR(10) NOT NULL CONSTRAINT [DF__Payments__status__619B8048] DEFAULT 'PENDING',
    [paid_at] DATETIME2,
    CONSTRAINT [PK__Payments__3213E83FED6ADFEE] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ__Payments__4659622892D8AE02] UNIQUE NONCLUSTERED ([order_id])
);

-- CreateTable
CREATE TABLE [dbo].[DailyReports] (
    [id] INT NOT NULL IDENTITY(1,1),
    [report_date] DATE NOT NULL,
    [total_orders] INT NOT NULL CONSTRAINT [DF__DailyRepo__total__6754599E] DEFAULT 0,
    [total_revenue] DECIMAL(10,2) NOT NULL CONSTRAINT [DF__DailyRepo__total__68487DD7] DEFAULT 0,
    [cancelled_orders] INT NOT NULL CONSTRAINT [DF__DailyRepo__cance__693CA210] DEFAULT 0,
    [top_item_id] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [DF__DailyRepo__creat__6A30C649] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__DailyRep__3213E83F70E406EB] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ__DailyRep__7BFFBECF86E9F24D] UNIQUE NONCLUSTERED ([report_date])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [user_id] INT,
    [action] NVARCHAR(50) NOT NULL,
    [target] NVARCHAR(50) NOT NULL,
    [target_id] INT,
    [detail] NVARCHAR(500),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [DF__AuditLog__create__6E01572D] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__AuditLog__3213E83FA983B742] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[MenuItems] ADD CONSTRAINT [fk_menuitems_category] FOREIGN KEY ([category_id]) REFERENCES [dbo].[Categories]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Orders] ADD CONSTRAINT [fk_orders_leader] FOREIGN KEY ([group_leader_id]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Orders] ADD CONSTRAINT [fk_orders_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrderItems] ADD CONSTRAINT [fk_orderitems_menuitem] FOREIGN KEY ([menu_item_id]) REFERENCES [dbo].[MenuItems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrderItems] ADD CONSTRAINT [fk_orderitems_order] FOREIGN KEY ([order_id]) REFERENCES [dbo].[Orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GroupMembers] ADD CONSTRAINT [fk_groupmembers_order] FOREIGN KEY ([order_id]) REFERENCES [dbo].[Orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GroupMembers] ADD CONSTRAINT [fk_groupmembers_user] FOREIGN KEY ([member_user_id]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Payments] ADD CONSTRAINT [fk_payments_order] FOREIGN KEY ([order_id]) REFERENCES [dbo].[Orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DailyReports] ADD CONSTRAINT [fk_reports_menuitem] FOREIGN KEY ([top_item_id]) REFERENCES [dbo].[MenuItems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [fk_auditlog_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
