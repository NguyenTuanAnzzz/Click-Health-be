const hasActiveSubscription = (user, now = new Date()) => {
  if (!user || user.subscriptionStatus === "NONE" || !user.subscriptionExpiry) {
    return false;
  }

  const expiry = new Date(user.subscriptionExpiry);
  return !Number.isNaN(expiry.getTime()) && expiry > now;
};

module.exports = { hasActiveSubscription };

