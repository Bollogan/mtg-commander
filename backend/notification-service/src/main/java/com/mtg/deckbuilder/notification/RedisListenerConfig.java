package com.mtg.deckbuilder.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

/**
 * Wires the Redis Pub/Sub listener container to the {@code notifications} channel.
 */
@Configuration
public class RedisListenerConfig {

    @Bean
    public ChannelTopic notificationsTopic(@Value("${notifications.channel:notifications}") String channel) {
        return new ChannelTopic(channel);
    }

    @Bean
    public ChannelTopic userEventsTopic(@Value("${user-events.channel:user-events}") String channel) {
        return new ChannelTopic(channel);
    }

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
            RedisConnectionFactory connectionFactory,
            NotificationSubscriber subscriber,
            UserDeletedListener userDeletedListener,
            ChannelTopic notificationsTopic,
            ChannelTopic userEventsTopic) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(subscriber, notificationsTopic);
        container.addMessageListener(userDeletedListener, userEventsTopic);
        return container;
    }
}
